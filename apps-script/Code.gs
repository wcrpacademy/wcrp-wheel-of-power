/**
 * Wheel of Power — Apps Script web app (one-time workshop use). Contract: docs/API.md.
 * Runs next to scoring.gs (generated from js/scoring.js by `npm run gs`): both files go in the same project.
 *
 * Install (once, as Ken):
 *   1. New Google Sheet "Wheel Database" → Extensions → Apps Script.
 *   2. Make two script files, Code.gs and scoring.gs, and paste this repo's apps-script/Code.gs and
 *      apps-script/scoring.gs into them. Project Settings → tick "Show appsscript.json", paste
 *      apps-script/appsscript.json.
 *   3. Run `setup` once (pick it in the toolbar → Run, allow access). It makes the Responses and Joins
 *      tabs with their headers and sets the time zone.
 *   4. Project Settings → Script properties (never in code or the repo):
 *        ADMIN_PIN_HASH        the hash `npm run pin` prints (the organiser PIN itself is never stored)
 *        MAILERLITE_API_TOKEN  MailerLite API key, for the newsletter sign-up (same as the values card sort)
 *        MAILERLITE_GROUP_ID   the MailerLite group to add people to (optional)
 *   5. Deploy → New deployment → Web app → Execute as: Me, Who has access: Anyone → copy the /exec URL
 *      into config.js `endpoint`. After a code change: Manage deployments → Edit → New version (same URL).
 *   6. After the workshop: export, archive, then Deploy → Manage deployments → Archive.
 * The Sheet itself stays private (share it with the team only): the script runs as Ken.
 *
 * Privacy: no names, emails, IPs or free text are ever stored. The summary returns aggregates only,
 * never a pid or a row. The export has no pid and no timestamp.
 * Newsletter sign-up (type "newsletter", Ken, 19 Nov 2026): the one place personal data passes through.
 * It is forwarded straight to MailerLite, never written to the Sheet, never logged, and carries no pid or
 * session, so it can't be linked to anyone's wheel.
 */

const RESPONSES = 'Responses';
const JOINS = 'Joins';
const JOINS_HEADER = ['timestamp', 'session', 'pid'];
const LANGS = ['en', 'fr'];
const MIN_GROUP_SERVER = 5;    // keep in sync with config.js minGroup
const MAX_BODY = 4000;         // characters
const CACHE_SECONDS = 5;       // summary cache (the projector polls every 5 s)
const PIN_MAX_FAILS = 10;      // wrong PINs before PIN calls are refused…
const PIN_LOCK_SECONDS = 600;  // …for 10 minutes after the last wrong one
const NOT_BANDED = 'not banded';

// MailerLite (new API). Same fields as the wcrp-academy.org sign-up form and the values card sort
// (field keys checked there with `npm run mailerlite`, 17 Nov 2026). Set a key to '' to skip that answer.
const ML_API = 'https://connect.mailerlite.com/api/subscribers';
const ML_FIELDS = {
  first_name: 'name',
  last_name: 'last_name',
  country: 'country',
  language: 'native_language',
  affiliation: 'affiliationinstitution',
  roles: 'are_you_aan',
  topics: 'what_topics_are_you_interested_in',
  consent: 'i_agree_to_receive_communications_from_the_wcrp_academy_and_accept_the_data_privacy_statement',
};
const ML_CONSENT_VALUE = 'on'; // what the consent field records when the box was ticked (same as the live site's form)

// Built on demand, not at load time: Apps Script may load this file before scoring.gs.
function responsesHeader() {
  return ['timestamp', 'session', 'pid', 'lang', 'consent'].concat(SECTION_KEYS, ['n', 'points', 'pct', 'band']);
}
const COL_SESSION = 1; // 0-based column indexes in both tabs
const COL_PID = 2;
const COL_LANG = 3;
const COL_FIRST_ANSWER = 5;

// ---------- Web app ----------

function doPost(e) {
  let data;
  try {
    const raw = (e && e.postData && e.postData.contents) || '';
    if (raw.length > MAX_BODY) return json({ ok: false, error: 'too_large' });
    data = JSON.parse(raw);
  } catch (err) {
    return json({ ok: false, error: 'bad_request' });
  }
  if (!data || typeof data !== 'object') return json({ ok: false, error: 'bad_request' });
  try {
    // Newsletter: no Sheet, no lock, nothing stored here.
    if (data.type === 'newsletter') return json(subscribe(data));
    if (data.type === 'join') return json(withLock(function () { return saveJoin(data); }));
    if (data.type === 'submit') return json(withLock(function () { return saveSubmit(data); }));
    if (data.type === 'pin') return json(pinError(data.pin) || { ok: true });
    if (data.type === 'export') return json(pinError(data.pin) || exportCsv(data));
    if (data.type === 'delete') return json(pinError(data.pin) || withLock(function () { return deleteByCode(data); }));
    return json({ ok: false, error: 'unknown_type' });
  } catch (err) {
    return json({ ok: false, error: 'server_error' });
  }
}

function doGet(e) {
  const p = (e && e.parameter) || {};
  if (p.type !== 'summary') return json({ ok: false, error: 'unknown_type' });
  if (!validSession(p.session)) return json({ ok: false, error: 'bad_session' });
  const cache = CacheService.getScriptCache();
  const key = cacheKey(p.session);
  const hit = cache.get(key);
  if (hit) return ContentService.createTextOutput(hit).setMimeType(ContentService.MimeType.JSON);
  const out = JSON.stringify(summary(p.session));
  cache.put(key, out, CACHE_SECONDS);
  return ContentService.createTextOutput(out).setMimeType(ContentService.MimeType.JSON);
}

/** Run once from the editor: makes both tabs with headers (keeps any rows already there). */
function setup() {
  const ss = SpreadsheetApp.getActive();
  [[RESPONSES, responsesHeader()], [JOINS, JOINS_HEADER]].forEach(function (pair) {
    const sheet = ss.getSheetByName(pair[0]) || ss.insertSheet(pair[0]);
    sheet.getRange(1, 1, 1, pair[1].length).setValues([pair[1]]).setFontWeight('bold');
    sheet.setFrozenRows(1);
    sheet.getRange('B:C').setNumberFormat('@'); // session and pid stay plain text
  });
  ss.setSpreadsheetTimeZone('Africa/Johannesburg');
}

// ---------- Writes ----------

function saveJoin(d) {
  if (!validSession(d.session) || !validPid(d.pid)) return { ok: false, error: 'bad_join' };
  addJoin(d.session, d.pid);
  clearSummary(d.session);
  return { ok: true };
}

function addJoin(session, pid) {
  const sheet = sh(JOINS);
  if (findRow(sheet, session, pid) > 0) return;
  sheet.appendRow([new Date(), session, pid]);
}

function saveSubmit(d) {
  if (!validSession(d.session) || !validPid(d.pid)) return { ok: false, error: 'bad_submit' };
  if (d.consent !== true) return { ok: false, error: 'no_consent' };
  const given = d.answers;
  if (!given || typeof given !== 'object' || Array.isArray(given)) return { ok: false, error: 'bad_answers' };
  const answers = SECTION_KEYS.map(function (k) { return normaliseAnswer(given[k]); });
  if (answers.some(function (v) { return v === null; })) return { ok: false, error: 'bad_answers' };
  const lang = LANGS.indexOf(d.lang) >= 0 ? d.lang : 'en';

  // The client's n, points, pct and band are ignored: the server scores the answers itself.
  const s = scorePerson(answers);
  const row = [new Date(), d.session, d.pid, lang, true].concat(answers, [
    s.n,
    s.points,
    s.pct === null ? '' : round2(s.pct),
    s.band ? BAND_LABELS[s.band] : NOT_BANDED,
  ]);
  const sheet = sh(RESPONSES);
  const at = findRow(sheet, d.session, d.pid);
  if (at > 0) sheet.getRange(at, 1, 1, row.length).setValues([row]); // one row per pid per session
  else sheet.appendRow(row);
  addJoin(d.session, d.pid);
  clearSummary(d.session);
  return { ok: true, n: s.n, points: s.points, pct: s.pct, band: s.band || '' };
}

function deleteByCode(d) {
  if (!validSession(d.session)) return { ok: false, error: 'bad_session' };
  const code = String(d.code || '').trim().toUpperCase();
  if (!/^[0-9A-F]{6}$/.test(code)) return { ok: false, error: 'bad_code' };
  const deleted = deleteMatching(sh(RESPONSES), d.session, code);
  deleteMatching(sh(JOINS), d.session, code);
  clearSummary(d.session);
  return { ok: true, deleted: deleted };
}

function deleteMatching(sheet, session, code) {
  const data = rows(sheet);
  let n = 0;
  for (let i = data.length - 1; i >= 0; i--) { // bottom up, so the row numbers above stay right
    if (String(data[i][COL_SESSION]) === session && codeOf(data[i][COL_PID]) === code) {
      sheet.deleteRow(i + 2);
      n++;
    }
  }
  return n;
}

// ---------- Reads ----------

/** Aggregates only: never a pid, a timestamp or a row. */
function summary(session) {
  const people = sessionRows(sh(RESPONSES), session);
  const g = summarise(people.map(answersOf));
  const pids = {};
  people.forEach(function (r) { pids[String(r[COL_PID])] = true; });
  sessionRows(sh(JOINS), session).forEach(function (r) { pids[String(r[COL_PID])] = true; });
  const enough = g.submitted >= MIN_GROUP_SERVER;
  let sections = null;
  if (enough) {
    sections = {};
    SECTION_KEYS.forEach(function (k) {
      const s = g.sections[k];
      // A section answered by fewer than MIN_GROUP_SERVER people never shows its average.
      sections[k] = { n: s.n, na: s.na, mean: s.n >= MIN_GROUP_SERVER ? s.mean : null };
    });
  }
  return {
    ok: true,
    session: session,
    joined: Object.keys(pids).length,
    submitted: g.submitted,
    banded: g.banded,
    notBanded: g.notBanded,
    bands: g.bands,
    groupPct: g.groupPct,
    pcts: g.pcts.map(round2),
    coverage: g.coverage,
    answeredAll: g.answeredAll,
    minGroup: MIN_GROUP_SERVER,
    sections: sections,
  };
}

/** Anonymised CSV: no pid, no timestamp, rows sorted by their answers (not by time). */
function exportCsv(d) {
  if (!validSession(d.session)) return { ok: false, error: 'bad_session' };
  const header = ['session', 'lang'].concat(SECTION_KEYS, ['n', 'points', 'pct', 'band']);
  const last = COL_FIRST_ANSWER + SECTION_KEYS.length;
  const lines = sessionRows(sh(RESPONSES), d.session)
    .map(function (r) {
      return [d.session, String(r[COL_LANG])]
        .concat(answersOf(r).map(String))
        .concat([r[last], r[last + 1], r[last + 2] === '' ? '' : r[last + 2], r[last + 3] || NOT_BANDED].map(String));
    })
    .sort(function (a, b) { return a.join(',') < b.join(',') ? -1 : a.join(',') > b.join(',') ? 1 : 0; });
  const csv = [header].concat(lines).map(function (l) { return l.map(csvCell).join(','); }).join('\n');
  return { ok: true, csv: csv };
}

// ---------- Newsletter → MailerLite ----------

/** Never stores or logs the person's details. */
function subscribe(d) {
  if (d.website) return { ok: true }; // spam trap filled in: pretend it worked, send nothing
  const email = text(d.email, 254).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return { ok: false, error: 'bad_email' };
  const first = text(d.first_name, 60);
  const last = text(d.last_name, 60);
  if (!first || !last) return { ok: false, error: 'missing_name' };
  if (d.consent !== true) return { ok: false, error: 'no_consent' };

  const props = PropertiesService.getScriptProperties();
  const key = props.getProperty('MAILERLITE_API_TOKEN');
  if (!key) return { ok: false, error: 'not_configured' };
  const group = props.getProperty('MAILERLITE_GROUP_ID');

  const answers = {
    first_name: first,
    last_name: last,
    country: text(d.country, 80),
    language: text(d.language, 40),
    affiliation: text(d.affiliation, 120),
    roles: textList(d.roles, 6, 40),
    topics: textList(d.topics, 6, 80),
    consent: ML_CONSENT_VALUE, // only reached when the box was ticked
  };
  const fields = {};
  Object.keys(ML_FIELDS).forEach(function (k) {
    if (ML_FIELDS[k] && answers[k]) fields[ML_FIELDS[k]] = answers[k];
  });
  const body = { email: email, fields: fields };
  if (group) body.groups = [String(group)];

  const res = UrlFetchApp.fetch(ML_API, {
    method: 'post',
    contentType: 'application/json',
    headers: { Authorization: 'Bearer ' + key, Accept: 'application/json' },
    payload: JSON.stringify(body),
    muteHttpExceptions: true,
  });
  const code = res.getResponseCode();
  if (code === 200 || code === 201) return { ok: true };
  if (code === 422 && /email/i.test(res.getContentText())) return { ok: false, error: 'bad_email' };
  return { ok: false, error: 'provider_error', status: code };
}

function text(v, max) { return String(v == null ? '' : v).trim().slice(0, max); }
function textList(arr, maxItems, maxLen) {
  return Array.isArray(arr) ? arr.slice(0, maxItems).map(function (v) { return text(v, maxLen); }).filter(String).join(', ') : '';
}

// ---------- PIN ----------

/** null when the PIN is right; otherwise the error reply. Locks PIN calls after too many wrong tries. */
function pinError(pin) {
  const cache = CacheService.getScriptCache();
  const fails = Number(cache.get('pin-fails') || 0);
  if (fails >= PIN_MAX_FAILS) return { ok: false, error: 'locked' };
  const want = String(PropertiesService.getScriptProperties().getProperty('ADMIN_PIN_HASH') || '').trim().toLowerCase();
  if (!want) return { ok: false, error: 'no_pin_set' };
  if (typeof pin === 'string' && pin.length > 0 && pin.length <= 100 && sha256Hex(pin) === want) return null;
  cache.put('pin-fails', String(fails + 1), PIN_LOCK_SECONDS);
  return { ok: false, error: 'pin' };
}

function sha256Hex(text) {
  return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, text, Utilities.Charset.UTF_8)
    .map(function (b) { return ((b + 256) % 256).toString(16).padStart(2, '0'); })
    .join('');
}

// ---------- Helpers ----------

// Session and pid start with a letter or digit, so a cell can never read as a formula.
function validSession(s) { return typeof s === 'string' && /^[A-Za-z0-9][A-Za-z0-9_-]{0,39}$/.test(s); }
function validPid(p) { return typeof p === 'string' && /^[A-Za-z0-9][A-Za-z0-9-]{7,63}$/.test(p); }
function codeOf(pid) { return String(pid).replace(/-/g, '').slice(-6).toUpperCase(); }
function round2(x) { return Math.round(x * 100) / 100; }
function answersOf(r) { return r.slice(COL_FIRST_ANSWER, COL_FIRST_ANSWER + SECTION_KEYS.length).map(normaliseAnswer); }

function sh(name) {
  const sheet = SpreadsheetApp.getActive().getSheetByName(name);
  if (!sheet) throw new Error('Missing tab ' + name + ': run setup');
  return sheet;
}
function rows(sheet) {
  const n = sheet.getLastRow() - 1;
  return n > 0 ? sheet.getRange(2, 1, n, sheet.getLastColumn()).getValues() : [];
}
function sessionRows(sheet, session) {
  return rows(sheet).filter(function (r) { return String(r[COL_SESSION]) === session; });
}
/** Sheet row number (2+) of this session + pid, or 0. */
function findRow(sheet, session, pid) {
  const n = sheet.getLastRow() - 1;
  if (n < 1) return 0;
  const keys = sheet.getRange(2, COL_SESSION + 1, n, 2).getValues();
  for (let i = 0; i < keys.length; i++) {
    if (String(keys[i][0]) === session && String(keys[i][1]) === pid) return i + 2;
  }
  return 0;
}

function withLock(fn) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    return fn();
  } finally {
    lock.releaseLock();
  }
}
function cacheKey(session) { return 'summary:' + session; }
function clearSummary(session) { CacheService.getScriptCache().remove(cacheKey(session)); }

function csvCell(v) {
  const s = String(v);
  return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}
function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
