// Local preview + test server (never deployed). Serves the site with config.js pointed at /exec on this
// same server, which runs the REAL apps-script/Code.gs + scoring.gs on a fake in-memory Sheet
// (tests/gas-sandbox.mjs), so every page works end to end exactly as it will against Google.
//
//   npm run preview                  → http://127.0.0.1:4173/   (/live and /admin too; organiser PIN 1234)
//   node tests/serve.mjs 4173 --seed → same, with the doc's 10 example people (P1–P10) already submitted
//
// Test-only routes: GET /__test/state, POST /__test/reset, POST /__test/seed?set=doc | ?n=6, POST /__test/outage?on=1
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { createHash, randomUUID } from 'node:crypto';
import { dirname, join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SECTION_KEYS, RING_VALUES, NA } from '../js/scoring.js';
import { PEOPLE } from './fixtures.mjs';
import { createAppsScript } from './gas-sandbox.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const PORT = Number(args.find((a) => /^\d+$/.test(a)) || process.env.PORT || 4173);
const PIN = process.env.TEST_PIN || '1234';
const PIN_HASH = createHash('sha256').update(PIN).digest('hex');

const configSession = async () => {
  const src = await readFile(join(ROOT, 'config.js'), 'utf8');
  const m = /session:\s*"([^"]*)"/.exec(src);
  return m ? m[1] : 'WS1';
};

// Same files the deploy uploads. Everything else is a 404.
const ALLOW = /^\/(index\.html|live\.html|admin\.html|config\.js|data\/[\w.-]+\.json|(css|js|fonts|img|qr)\/[\w.-]+)$/;
const ROUTES = { '/': '/index.html', '/live': '/live.html', '/admin': '/admin.html' };
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.woff2': 'font/woff2',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
};

// ---------- The real Apps Script (apps-script/*.gs) on a fake "Wheel Database" Sheet ----------
const gas = createAppsScript({ pinHash: PIN_HASH });
let outage = false;

const answersObj = (list) => Object.fromEntries(SECTION_KEYS.map((k, i) => [k, list[i]]));
function addPerson(session, pid, answers) {
  gas.post({ type: 'join', session, pid });
  const reply = gas.post({ type: 'submit', session, pid, lang: 'en', consent: true, answers: answersObj(answers) });
  if (!reply.ok) throw new Error(`seed failed: ${reply.error}`);
}
function seedDoc(session) {
  for (const [name, answers] of Object.entries(PEOPLE)) addPerson(session, `seed-${name}-${randomUUID()}`, answers);
}
function seedRandom(session, n) {
  for (let i = 0; i < n; i++) {
    addPerson(session, `seed-${randomUUID()}`, SECTION_KEYS.map(() => (Math.random() < 0.08 ? NA : RING_VALUES[Math.floor(Math.random() ** 0.8 * 5)])));
  }
}

// ---------- HTTP ----------
const send = (res, code, body, type = 'application/json; charset=utf-8', extra = {}) => {
  res.writeHead(code, { 'Content-Type': type, 'Cache-Control': 'no-store', ...extra });
  res.end(body);
};
const cors = { 'Access-Control-Allow-Origin': '*' };

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const path = ROUTES[url.pathname] || url.pathname;

  if (path === '/exec') {
    if (outage) return send(res, 503, 'Service unavailable', 'text/plain', cors);
    if (req.method === 'GET') return send(res, 200, JSON.stringify(gas.get(Object.fromEntries(url.searchParams))), undefined, cors);
    if (req.method === 'POST') {
      let raw = '';
      for await (const chunk of req) raw += chunk;
      return send(res, 200, JSON.stringify(gas.post(raw)), undefined, cors);
    }
    return send(res, 405, '{}', undefined, cors);
  }

  if (path.startsWith('/__test/')) {
    const session = url.searchParams.get('session') || (await configSession());
    if (path === '/__test/state') return send(res, 200, JSON.stringify({ responses: gas.table('Responses'), joins: gas.table('Joins'), mailerlite: gas.mailerlite }));
    if (path === '/__test/reset' && req.method === 'POST') { gas.reset(); outage = false; return send(res, 200, '{"ok":true}'); }
    if (path === '/__test/seed' && req.method === 'POST') {
      if (url.searchParams.get('set') === 'doc') seedDoc(session);
      else seedRandom(session, Number(url.searchParams.get('n') || 6));
      return send(res, 200, '{"ok":true}');
    }
    if (path === '/__test/outage' && req.method === 'POST') { outage = url.searchParams.get('on') === '1'; return send(res, 200, '{"ok":true}'); }
    return send(res, 404, '{}');
  }

  if (!ALLOW.test(path)) return send(res, 404, 'Not found', 'text/plain');
  try {
    let body = await readFile(join(ROOT, path));
    if (path === '/config.js') {
      body = body.toString('utf8').replace(/endpoint:\s*"[^"]*"/, `endpoint: "http://127.0.0.1:${PORT}/exec"`);
    }
    send(res, 200, body, TYPES[extname(path)] || 'application/octet-stream');
  } catch {
    send(res, 404, 'Not found', 'text/plain');
  }
});

if (args.includes('--seed')) seedDoc(await configSession());
server.listen(PORT, '127.0.0.1', () =>
  console.log(`Preview on http://127.0.0.1:${PORT}/  (/live, /admin; apps-script/*.gs at /exec on a fake Sheet; organiser PIN ${PIN})`),
);
