// Organiser page (/admin): PIN, session, CSV export, delete by code, reset this phone, report.
// The PIN is checked by the Apps Script (its hash lives in Script properties, never in this public site), and
// again on every export and delete. After 10 wrong PINs the Apps Script refuses PIN calls for 10 minutes.
import { SECTION_KEYS, BAND_LABELS, summarise, ringToPct } from './scoring.js';
import { endpointUrl, postJson, fetchSummary } from './endpoint.js';
import { viewSession, setViewSession, cleanSession } from './session.js';
import { clearPhone } from './store.js';
import { clearOutbox } from './send.js';
import { renderBandStrip, renderSectionBars } from './charts.js';

const cfg = window.WHEEL_CONFIG || {};
const BOM = String.fromCharCode(0xfeff); // so Excel opens the CSV as UTF-8
const BOM_RE = new RegExp('^' + BOM);
const $ = (s) => document.querySelector(s);
let pin = '';
let session = viewSession(cfg);
let sections = [];

// ---------- PIN ----------
$('#pin-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const err = $('#pin-error');
  const value = $('#pin').value.trim();
  const url = endpointUrl(cfg);
  if (!url) {
    showError(err, 'No Apps Script is connected yet: put its web app URL in config.js (endpoint).');
    return;
  }
  if (!value) {
    showError(err, 'Enter the PIN.');
    return;
  }
  const button = e.submitter || $('#pin-form button[type="submit"]');
  if (button) button.disabled = true;
  let reply = null;
  try {
    reply = await postJson(url, { type: 'pin', pin: value });
  } catch {
    reply = null;
  }
  if (button) button.disabled = false;
  if (!reply || reply.ok !== true) {
    showError(err, pinMessage(reply));
    $('#pin').select();
    return;
  }
  pin = value;
  err.hidden = true;
  $('#pin-form').hidden = true;
  $('#panel').hidden = false;
  await openPanel();
});

/** Error text for a refused PIN call. */
function pinMessage(reply) {
  const code = reply && reply.error;
  if (code === 'pin') return 'That PIN is not right.';
  if (code === 'locked') return 'Too many wrong PINs. Wait 10 minutes, then try again.';
  if (code === 'no_pin_set') return 'No organiser PIN is set yet: add ADMIN_PIN_HASH in the Apps Script’s Script properties (npm run pin).';
  return 'Couldn’t reach the Apps Script. Check the connection and try again.';
}

function showError(node, text) {
  node.textContent = text;
  node.hidden = false;
}

// ---------- Panel ----------
async function openPanel() {
  const data = await (await fetch('data/sections.json', { cache: 'no-cache' })).json();
  sections = data.sections;
  renderSession();
  if (cfg.sheetUrl) {
    $('#sheet-link').href = cfg.sheetUrl;
    $('#sheet-link').hidden = false;
  }
  await refreshCounts();
  setInterval(refreshCounts, 10000);
  document.querySelector('#panel h1').setAttribute('tabindex', '-1');
  document.querySelector('#panel h1').focus();
}

function renderSession() {
  $('#session-code').textContent = session;
  $('#session-input').value = session;
  const base = cfg.publicUrl ? `https://${cfg.publicUrl}/` : new URL('./', location.href).href;
  const link = `${base}?session=${encodeURIComponent(session)}`;
  $('#session-link').href = link;
  $('#session-link').textContent = link;
  $('#live-link').href = `live.html?session=${encodeURIComponent(session)}`;
  $('#session-reset').hidden = session === (cleanSession(cfg.session) || 'default');
}

async function refreshCounts() {
  if (!endpointUrl(cfg)) {
    $('#stat-joined').textContent = '–';
    $('#stat-submitted').textContent = '–';
    return;
  }
  try {
    const s = await fetchSummary(cfg, session);
    $('#stat-joined').textContent = s.joined;
    $('#stat-submitted').textContent = s.submitted;
  } catch {
    /* keep the last numbers */
  }
}

$('#session-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const v = cleanSession($('#session-input').value);
  if (!v) {
    $('#session-input').setAttribute('aria-invalid', 'true');
    return;
  }
  $('#session-input').removeAttribute('aria-invalid');
  session = v;
  setViewSession(v === cleanSession(cfg.session) ? '' : v);
  renderSession();
  refreshCounts();
  $('#report').hidden = true;
});
$('#session-reset').addEventListener('click', () => {
  setViewSession('');
  session = cleanSession(cfg.session) || 'default';
  renderSession();
  refreshCounts();
});

// ---------- CSV ----------
async function fetchCsv() {
  const url = endpointUrl(cfg);
  if (!url) throw new Error('No endpoint set in config.js.');
  const reply = await postJson(url, { type: 'export', session, pin });
  if (!reply || reply.ok !== true) throw new Error(reply && reply.error ? pinMessage(reply) : 'The export failed.');
  return String(reply.csv || '');
}

$('#csv-btn').addEventListener('click', async () => {
  const status = $('#csv-status');
  status.textContent = 'Preparing…';
  try {
    const csv = await fetchCsv();
    const blob = new Blob([BOM + `${csv}\n`], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `wheel-${session}-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    status.textContent = `Downloaded ${Math.max(0, csv.split('\n').length - 1)} rows.`;
  } catch (err) {
    status.textContent = err.message || 'The export failed.';
  }
});

// ---------- Delete by code ----------
$('#delete-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const code = $('#delete-code').value.trim().toUpperCase();
  const status = $('#delete-status');
  if (!/^[0-9A-F]{6}$/.test(code)) {
    status.textContent = 'Enter the 6-character code (letters A–F and numbers).';
    return;
  }
  confirmDialog(`Delete the answers with code ${code} from session ${session}? This can’t be undone.`, 'Delete', async () => {
    status.textContent = 'Deleting…';
    try {
      const url = endpointUrl(cfg);
      if (!url) throw new Error('No endpoint set in config.js.');
      const reply = await postJson(url, { type: 'delete', session, code, pin });
      if (!reply || reply.ok !== true) throw new Error(reply && ['pin', 'locked', 'no_pin_set'].includes(reply.error) ? pinMessage(reply) : 'The delete failed.');
      status.textContent = reply.deleted ? `Deleted ${reply.deleted} row.` : `No row with code ${code} in session ${session}.`;
      $('#delete-code').value = '';
      refreshCounts();
    } catch (err) {
      status.textContent = err.message;
    }
  });
});

// ---------- Reset this phone ----------
$('#reset-phone').addEventListener('click', () => {
  confirmDialog('Reset this phone? Its answers, draft and anything waiting to send are cleared. Rows already in the Sheet stay.', 'Reset', () => {
    clearOutbox();
    clearPhone();
    $('#reset-status').textContent = 'This phone was reset.';
  });
});

// ---------- Report ----------
$('#report-btn').addEventListener('click', loadReport);

/** Parses the export CSV (header row, then one row per person) into answer arrays. */
export function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;
  const src = text.replace(BOM_RE, '');
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (quoted) {
      if (c === '"' && src[i + 1] === '"') { cell += '"'; i++; } else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { row.push(cell); cell = ''; } else if (c === '\n' || c === '\r') {
      if (c === '\r' && src[i + 1] === '\n') i++;
      row.push(cell); rows.push(row); row = []; cell = '';
    } else cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  const [header, ...body] = rows.filter((r) => r.some((x) => x !== ''));
  const idx = SECTION_KEYS.map((k) => header.indexOf(k));
  return body.map((r) => idx.map((i) => r[i]));
}

async function loadReport() {
  const status = $('#report-status');
  status.textContent = 'Loading…';
  try {
    const people = parseCsv(await fetchCsv());
    const g = summarise(people);
    drawReport(g);
    status.textContent = `Session ${session}: ${g.submitted} people.`;
  } catch (err) {
    status.textContent = err.message || 'Could not load the report.';
  }
}

const pct1 = (x) => (x === null || x === undefined ? '–' : `${x.toFixed(1)}%`);
const share = (a, b) => (b ? ` (${Math.round((a / b) * 100)}%)` : '');

function fillBody(table, rows) {
  const tbody = table.querySelector('tbody');
  tbody.replaceChildren(
    ...rows.map((cells) => {
      const tr = document.createElement('tr');
      cells.forEach((c, i) => {
        const td = document.createElement(i === 0 ? 'th' : 'td');
        if (i === 0) td.scope = 'row';
        const v = typeof c === 'object' && c !== null ? c : { text: c };
        td.textContent = v.text;
        if (v.num) td.className = 'num';
        tr.append(td);
      });
      return tr;
    }),
  );
}

function drawReport(g) {
  $('#report').hidden = false;
  fillBody($('#t-headline'), [
    ['Coverage', `${g.coverage.answered} of ${g.coverage.possible} answers${share(g.coverage.answered, g.coverage.possible)}`, `${g.submitted} people × 12 sections; the other ${g.coverage.possible - g.coverage.answered} were N/A`],
    ['Answered all 12', `${g.answeredAll} of ${g.submitted} people`, ''],
    ['Included in group %', `${g.banded} of ${g.submitted}`, 'Minimum 9 of 12 sections'],
    ['Group position', `${pct1(g.groupPct)} rescaled`, `Average of the ${g.banded} included people’s %`],
  ]);
  fillBody($('#t-bands'), [
    [BAND_LABELS.high, { text: g.bands.high, num: true }],
    [BAND_LABELS.mid, { text: g.bands.mid, num: true }],
    [BAND_LABELS.low, { text: g.bands.low, num: true }],
    ['Not banded (fewer than 9 sections)', { text: g.notBanded, num: true }],
  ]);
  renderBandStrip($('#r-bandstrip'), g, { theme: 'light' });

  const rows = sections.map((s) => {
    const st = g.sections[s.key];
    const c = st.counts;
    return [
      s.label.en,
      { text: st.mean === null ? '–' : st.mean.toFixed(2), num: true },
      { text: st.mean === null ? '–' : `${Math.round(ringToPct(st.mean))}%`, num: true },
      { text: `${st.n} of ${g.submitted}`, num: true },
      { text: st.na, num: true },
      ...[1, 1.5, 2, 2.5, 3].map((v) => ({ text: c[v], num: true })),
    ];
  });
  fillBody($('#t-sections'), rows);
  // Organisers see every section here (they hold the full export anyway).
  renderSectionBars($('#r-secbars'), sections, Object.fromEntries(SECTION_KEYS.map((k) => [k, g.sections[k]])), g.submitted, { theme: 'light' });
}

// ---------- Confirm ----------
function confirmDialog(text, yesLabel, onYes) {
  const dlg = $('#confirm-dialog');
  $('#confirm-text').textContent = text;
  $('#confirm-ok').textContent = yesLabel;
  const ok = $('#confirm-ok');
  const cancel = $('#confirm-cancel');
  const close = (yes) => {
    ok.removeEventListener('click', yesFn);
    cancel.removeEventListener('click', noFn);
    dlg.close();
    if (yes) onYes();
  };
  const yesFn = () => close(true);
  const noFn = () => close(false);
  ok.addEventListener('click', yesFn);
  cancel.addEventListener('click', noFn);
  dlg.showModal();
  cancel.focus();
}
