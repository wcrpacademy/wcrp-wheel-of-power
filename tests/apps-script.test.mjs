// apps-script/Code.gs + scoring.gs, run in the sandbox (tests/gas-sandbox.mjs) against a fake Sheet.
// Phase 4 done-when: the summary matches the doc's 10-person example when seeded with P1–P10.
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createAppsScript } from './gas-sandbox.mjs';
import { PEOPLE, DOC_PARTICIPANT } from './fixtures.mjs';
import { SECTION_KEYS, NA } from '../js/scoring.js';

const PIN = '482913';
const gas = createAppsScript({ pinHash: createHash('sha256').update(PIN).digest('hex') });
const S = 'WS1';
const obj = (list) => Object.fromEntries(SECTION_KEYS.map((k, i) => [k, list[i]]));
const pid = (n) => `0f0e0d0c-0b0a-4000-8000-${String(n).padStart(12, '0')}`;
const submit = (p, answers, extra = {}) =>
  gas.post({ type: 'submit', session: S, pid: p, lang: 'en', consent: true, answers: obj(answers), ...extra });
const seedDoc = () => Object.values(PEOPLE).forEach((a, i) => assert.equal(submit(pid(i + 1), a).ok, true));

beforeEach(() => gas.reset());

test('setup makes both tabs with their headers', () => {
  assert.deepEqual(gas.rawRows('Responses')[0], ['timestamp', 'session', 'pid', 'lang', 'consent', ...SECTION_KEYS, 'n', 'points', 'pct', 'band']);
  assert.deepEqual(gas.rawRows('Joins')[0], ['timestamp', 'session', 'pid']);
});

test('summary matches the doc for P1–P10', () => {
  seedDoc();
  const s = gas.get({ type: 'summary', session: S });
  assert.equal(s.ok, true);
  assert.equal(s.joined, 10);
  assert.equal(s.submitted, 10);
  assert.equal(s.banded, 9);
  assert.equal(s.notBanded, 1);
  assert.deepEqual({ ...s.bands }, { high: 1, mid: 1, low: 7 });
  assert.equal(s.groupPct.toFixed(1), '58.9');
  assert.equal(s.pcts.length, 9);
  assert.deepEqual([...s.pcts], [...s.pcts].sort((a, b) => a - b));
  assert.deepEqual({ ...s.coverage }, { answered: 108, possible: 120 });
  assert.equal(s.answeredAll, 7);
  assert.equal(s.sections.ability.n, 10);
  assert.equal(s.sections.ability.mean.toFixed(2), '2.70');
  assert.equal(s.sections.wealth.n, 9);
  assert.equal(s.sections.wealth.mean.toFixed(2), '1.83');
  assert.doesNotMatch(JSON.stringify(s), /0f0e0d0c|pid|timestamp/);
});

test('sections stay hidden under 5 submissions, and a section mean under 5 answers', () => {
  for (let i = 1; i <= 4; i++) submit(pid(i), Array(12).fill(2));
  assert.equal(gas.get({ type: 'summary', session: S }).sections, null);
  submit(pid(5), [NA, ...Array(11).fill(3)]);
  const s = gas.get({ type: 'summary', session: S });
  assert.equal(s.sections.education.n, 5);
  assert.equal(s.sections.skin.n, 4);
  assert.equal(s.sections.skin.mean, null);
});

test('the server scores the answers itself and ignores the client score', () => {
  const reply = submit(pid(1), DOC_PARTICIPANT, { n: 12, points: 36, pct: 100, band: 'high' });
  assert.deepEqual([reply.n, reply.points, reply.band], [11, 25, 'low']);
  assert.equal(reply.pct.toFixed(1), '63.6');
  const [row] = gas.table('Responses');
  assert.equal(row.pct, 63.64);
  assert.equal(row.band, '70% and below');
  assert.equal(row.skin, 'NA');
  assert.equal(row.education, 2.5);
});

test('one row per pid per session: a resubmission replaces it; joins are counted once', () => {
  gas.post({ type: 'join', session: S, pid: pid(1) });
  gas.post({ type: 'join', session: S, pid: pid(1) });
  submit(pid(1), Array(12).fill(1));
  submit(pid(1), Array(12).fill(3));
  submit(pid(1), Array(12).fill(3), { session: 'WS2' });
  assert.equal(gas.table('Responses').length, 2);
  assert.equal(gas.table('Responses')[0].band, '90% and above');
  assert.equal(gas.table('Joins').length, 2);
  assert.equal(gas.get({ type: 'summary', session: S }).joined, 1);
});

test('bad input is refused and writes nothing', () => {
  const good = Array(12).fill(2);
  const cases = [
    submit(pid(1), good, { consent: false }),
    submit(pid(1), good, { consent: 'true' }),
    submit(pid(1), [4, ...good.slice(1)]),
    submit(pid(1), [0.5, ...good.slice(1)]),
    gas.post({ type: 'submit', session: S, pid: pid(1), consent: true, answers: { skin: 2 } }),
    submit(pid(1), good, { session: '=HYPERLINK("x")' }),
    submit(pid(1), good, { session: '-1' }),
    submit('=1+1-aaaaaaaa', good),
    submit('short', good),
    gas.post('not json'),
    gas.post('x'.repeat(5000)),
    gas.post({ type: 'nope' }),
  ];
  for (const r of cases) assert.equal(r.ok, false, JSON.stringify(r));
  assert.equal(gas.table('Responses').length, 0);
  assert.equal(gas.table('Joins').length, 0);
  assert.equal(gas.get({ type: 'summary', session: '=x' }).ok, false);
});

test('an unknown language is stored as en', () => {
  submit(pid(1), Array(12).fill(2), { lang: '<script>' });
  assert.equal(gas.table('Responses')[0].lang, 'en');
});

test('export: PIN needed; no pid, no timestamp, rows sorted by answers', () => {
  seedDoc();
  submit(pid(99), Array(12).fill(3), { session: 'OTHER' });
  assert.deepEqual(gas.post({ type: 'export', session: S, pin: 'nope00' }), { ok: false, error: 'pin' });
  const r = gas.post({ type: 'export', session: S, pin: PIN });
  assert.equal(r.ok, true);
  const [header, ...rows] = r.csv.split('\n');
  assert.equal(header, `session,lang,${SECTION_KEYS.join(',')},n,points,pct,band`);
  assert.equal(rows.length, 10);
  assert.deepEqual(rows, [...rows].sort());
  assert.doesNotMatch(r.csv, /0f0e0d0c|T\d\d:\d\d/);
  assert.ok(rows.some((l) => l.endsWith(',not banded')));
});

test('delete by withdrawal code removes that person from both tabs', () => {
  seedDoc();
  submit(pid(77), Array(12).fill(2));
  const code = pid(77).replace(/-/g, '').slice(-6).toUpperCase();
  assert.equal(gas.post({ type: 'delete', session: S, code, pin: 'wrong1' }).ok, false);
  assert.deepEqual(gas.post({ type: 'delete', session: S, code: code.toLowerCase(), pin: PIN }), { ok: true, deleted: 1 });
  assert.equal(gas.table('Responses').length, 10);
  assert.equal(gas.table('Joins').length, 10);
  assert.equal(gas.post({ type: 'delete', session: S, code: 'XYZ', pin: PIN }).ok, false);
});

test('the summary cache is cleared by every write', () => {
  for (let i = 1; i <= 5; i++) submit(pid(i), Array(12).fill(2));
  assert.equal(gas.get({ type: 'summary', session: S }).submitted, 5);
  submit(pid(6), Array(12).fill(2));
  assert.equal(gas.get({ type: 'summary', session: S }).submitted, 6);
});

test('PIN: right, wrong, locked after 10 wrong tries, and not set', () => {
  assert.deepEqual(gas.post({ type: 'pin', pin: PIN }), { ok: true });
  for (let i = 0; i < 10; i++) assert.equal(gas.post({ type: 'pin', pin: `bad${i}` }).error, 'pin');
  assert.deepEqual(gas.post({ type: 'pin', pin: PIN }), { ok: false, error: 'locked' });
  assert.equal(gas.post({ type: 'export', session: S, pin: PIN }).error, 'locked');
  gas.clearCache();
  const saved = gas.props.ADMIN_PIN_HASH;
  gas.props.ADMIN_PIN_HASH = '';
  assert.deepEqual(gas.post({ type: 'pin', pin: PIN }), { ok: false, error: 'no_pin_set' });
  gas.props.ADMIN_PIN_HASH = saved;
});

test('newsletter: forwarded to MailerLite only, never to the Sheet', () => {
  const sign = (extra = {}) =>
    gas.post({ type: 'newsletter', first_name: ' Thandi ', last_name: 'Nkosi', email: 'Thandi@Example.org', country: 'South Africa', roles: ['Researcher'], consent: true, ...extra });
  assert.deepEqual(sign(), { ok: true });
  assert.equal(gas.mailerlite.length, 1);
  const sent = gas.mailerlite[0].body;
  assert.equal(sent.email, 'thandi@example.org');
  assert.deepEqual([...sent.groups], ['test-group']);
  assert.equal(sent.fields.name, 'Thandi');
  assert.equal(sent.fields.are_you_aan, 'Researcher');
  assert.equal(sent.fields.i_agree_to_receive_communications_from_the_wcrp_academy_and_accept_the_data_privacy_statement, 'on');
  assert.equal(gas.table('Responses').length, 0);
  assert.equal(gas.table('Joins').length, 0);

  assert.equal(sign({ consent: false }).error, 'no_consent');
  assert.equal(sign({ email: 'nope' }).error, 'bad_email');
  assert.equal(sign({ first_name: '' }).error, 'missing_name');
  assert.deepEqual(sign({ website: 'spam.example' }), { ok: true });
  assert.equal(sign({ email: 'fail@example.org' }).error, 'provider_error');
  assert.equal(gas.mailerlite.length, 2); // the good one and the provider failure were sent; the rest stopped here
});
