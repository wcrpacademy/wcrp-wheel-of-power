// Runs the real apps-script/scoring.gs + Code.gs in a Node vm with small stand-ins for the Google services
// they use (SpreadsheetApp, LockService, CacheService, PropertiesService, Utilities, UrlFetchApp, ContentService).
// UrlFetchApp records what would go to MailerLite (gas.mailerlite) instead of sending it; an email with
// "fail@" in it gets a 500 back.
// Used by tests/serve.mjs (local preview + Playwright) and tests/apps-script.test.mjs.
//
//   const gas = createAppsScript({ pinHash })
//   gas.post({ type: 'submit', … })      → parsed JSON reply (doPost)
//   gas.get({ type: 'summary', session }) → parsed JSON reply (doGet)
//   gas.table('Responses')               → rows as objects keyed by the header
//   gas.reset()                          → empty Sheet (setup() run again), cache cleared
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

function makeSheet() {
  const rows = []; // rows[0] = header (row 1)
  const range = (r, c, nr, nc) => {
    const self = {
      getValues: () => Array.from({ length: nr }, (_, i) => Array.from({ length: nc }, (_, j) => (rows[r - 1 + i] || [])[c - 1 + j] ?? '')),
      setValues: (vals) => {
        vals.forEach((v, i) => {
          const row = rows[r - 1 + i] || (rows[r - 1 + i] = []);
          v.forEach((x, j) => { row[c - 1 + j] = x; });
        });
        return self;
      },
      setFontWeight: () => self,
      setNumberFormat: () => self,
    };
    return self;
  };
  return {
    rows,
    appendRow: (r) => { rows.push([...r]); },
    getLastRow: () => rows.length,
    getLastColumn: () => rows.reduce((m, r) => Math.max(m, r.length), 0),
    getRange: (r, c, nr = 1, nc = 1) => (typeof r === 'string' ? range(1, 1, 0, 0) : range(r, c, nr, nc)),
    deleteRow: (i) => { rows.splice(i - 1, 1); },
    setFrozenRows: () => {},
  };
}

export function createAppsScript({ pinHash = '' } = {}) {
  let sheets = {};
  const cache = new Map();
  const props = { ADMIN_PIN_HASH: pinHash, MAILERLITE_API_TOKEN: 'test-key', MAILERLITE_GROUP_ID: 'test-group' };
  const mailerlite = []; // what would have gone to MailerLite

  const ctx = vm.createContext({
    SpreadsheetApp: {
      getActive: () => ({
        getSheetByName: (n) => sheets[n] || null,
        insertSheet: (n) => (sheets[n] = makeSheet()),
        setSpreadsheetTimeZone: () => {},
      }),
    },
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
    CacheService: {
      getScriptCache: () => ({
        get: (k) => { const e = cache.get(k); return e && e.until > Date.now() ? e.v : null; },
        put: (k, v, s) => { cache.set(k, { v: String(v), until: Date.now() + s * 1000 }); },
        remove: (k) => { cache.delete(k); },
      }),
    },
    PropertiesService: { getScriptProperties: () => ({ getProperty: (k) => props[k] || null }) },
    Utilities: {
      DigestAlgorithm: { SHA_256: 'sha256' },
      Charset: { UTF_8: 'utf8' },
      // Apps Script returns signed bytes (-128…127)
      computeDigest: (alg, text) => Array.from(createHash(alg).update(String(text), 'utf8').digest(), (b) => (b > 127 ? b - 256 : b)),
    },
    UrlFetchApp: {
      fetch: (url, opts) => {
        const body = JSON.parse(opts.payload);
        mailerlite.push({ url, body });
        const fail = /fail@/.test(body.email);
        return { getResponseCode: () => (fail ? 500 : 201), getContentText: () => '{}' };
      },
    },
    ContentService: {
      MimeType: { JSON: 'json' },
      createTextOutput: (s) => ({ s, setMimeType() { return this; } }),
    },
  });
  // Same order the Apps Script project may load them in either way: Code.gs must not need scoring.gs at load time.
  vm.runInContext(readFileSync(join(ROOT, 'apps-script', 'Code.gs'), 'utf8'), ctx, { filename: 'Code.gs' });
  vm.runInContext(readFileSync(join(ROOT, 'apps-script', 'scoring.gs'), 'utf8'), ctx, { filename: 'scoring.gs' });

  function reset() {
    sheets = {};
    cache.clear();
    mailerlite.length = 0;
    ctx.setup();
  }
  reset();

  return {
    reset,
    props,
    mailerlite,
    clearCache: () => cache.clear(),
    post: (body) => JSON.parse(ctx.doPost({ postData: { contents: typeof body === 'string' ? body : JSON.stringify(body) } }).s),
    get: (params) => JSON.parse(ctx.doGet({ parameter: params }).s),
    rawRows: (name) => sheets[name].rows,
    table(name) {
      const [header = [], ...data] = sheets[name].rows;
      return data.map((r) => Object.fromEntries(header.map((h, i) => [h, r[i] instanceof Date ? r[i].toISOString() : r[i] ?? ''])));
    },
  };
}
