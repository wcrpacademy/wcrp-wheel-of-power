// Projector view (/live): joined counter, band strip with counts, toggle to per-section bars.
// Polls the Apps Script summary every config.livePollSeconds (5 s). Aggregates only: never a pid, a name
// or an individual row. Nothing is shown until config.minGroup people have finished.
import { fetchSummary } from './endpoint.js';
import { renderBandStrip, renderSectionBars } from './charts.js';
import { viewSession } from './session.js';

const cfg = window.WHEEL_CONFIG || {};
const MIN_GROUP = Number(cfg.minGroup) || 5;
const POLL_MS = Math.max(2, Number(cfg.livePollSeconds) || 5) * 1000;
const $ = (s) => document.querySelector(s);
const session = viewSession(cfg);

let sections = [];
let last = null;
let lastOk = 0;
let failed = false;
let view = 'bands';

async function init() {
  const data = await (await fetch('data/sections.json', { cache: 'no-cache' })).json();
  sections = data.sections;
  const name = typeof cfg.eventName === 'object' && cfg.eventName ? cfg.eventName.en : cfg.eventName;
  $('#live-sub').textContent = [name, `Session ${session}`].filter(Boolean).join(' · ');
  $('#min-group').textContent = MIN_GROUP;
  $('#join-url').textContent = cfg.publicUrl || location.host;
  $('#show-bands').addEventListener('click', () => setView('bands'));
  $('#show-sections').addEventListener('click', () => setView('sections'));
  await poll();
  setInterval(poll, POLL_MS);
  setInterval(renderStatus, 1000);
}

function setView(v) {
  view = v;
  $('#show-bands').setAttribute('aria-pressed', String(v === 'bands'));
  $('#show-sections').setAttribute('aria-pressed', String(v === 'sections'));
  draw();
}

async function poll() {
  if (!cfg.endpoint) {
    failed = true;
    renderStatus();
    return;
  }
  try {
    last = await fetchSummary(cfg, session);
    lastOk = Date.now();
    failed = false;
  } catch {
    failed = true; // keep the last numbers on screen
  }
  draw();
  renderStatus();
}

function draw() {
  if (!last) return;
  setCount('#joined', last.joined);
  setCount('#submitted', last.submitted);
  const enough = last.submitted >= MIN_GROUP;
  $('#waiting').hidden = enough;
  $('#results').hidden = !enough;
  if (!enough) return;

  $('#group-pct').textContent = typeof last.groupPct === 'number' ? `${last.groupPct.toFixed(1)}%` : '–';
  const notes = [`${last.banded} of ${last.submitted} people included`];
  if (last.notBanded) notes.push(`${last.notBanded} answered fewer than 9 sections`);
  $('#headnote').textContent = notes.join(' · ');

  $('#view-bands').hidden = view !== 'bands';
  $('#view-sections').hidden = view !== 'sections';
  if (view === 'bands') renderBandStrip($('#bandstrip'), last, { theme: 'dark' });
  else if (last.sections) renderSectionBars($('#secbars'), sections, last.sections, last.submitted, { theme: 'dark' });
}

function setCount(sel, n) {
  const node = $(sel);
  const text = String(n ?? '–');
  if (node.textContent !== text) {
    node.textContent = text;
    node.classList.remove('is-bump');
    void node.offsetWidth; // restart the animation
    node.classList.add('is-bump');
  }
}

function renderStatus() {
  const s = $('#status');
  if (!cfg.endpoint) s.textContent = 'No endpoint set in config.js';
  else if (failed) s.textContent = 'Reconnecting…';
  else if (lastOk) s.textContent = `Updated ${Math.max(0, Math.round((Date.now() - lastOk) / 1000))} s ago`;
}

init().catch((err) => {
  console.error(err);
  $('#status').textContent = 'Could not start. Reload the page.';
});
