// Participant page: intro and consent → 12 questions → review → submit → Your wheel → Deep analytics.
// EXECUTION_PLAN.md §4 screens 1–5. One page; screens swap in place; the draft is saved after every change.
import { SECTION_KEYS, RING_VALUES, NA, scorePerson, isComplete } from './scoring.js';
import { initLang, getLang, getLanguages, setLang, onLangChange, t, fmtPct, pick, applyText, LANG_NAMES } from './i18n.js';
import { restoreState, resetState, saveState, storageWorks, withdrawalCode } from './store.js';
import { initSender, enqueue, flush, canSend, isQueued, isSending } from './send.js';
import { fetchSummary } from './endpoint.js';
import { createWheel } from './wheel.js';
import { renderDotPlot } from './dotplot.js';
import { initNewsletter, relabelNewsletter } from './newsletter.js';

const cfg = window.WHEEL_CONFIG || {};
const MIN_GROUP = Number(cfg.minGroup) || 5;
const TOTAL = SECTION_KEYS.length;

const $ = (sel) => document.querySelector(sel);
let sections = [];
let state;
let canStore = true;
const wheels = {};
let summary = { status: 'idle', data: null };

const joinId = () => `join:${state.session}:${state.pid}`;
const submitId = () => `submit:${state.session}:${state.pid}`;

// ---------- Start ----------

init().catch((err) => {
  console.error(err);
  show('error');
});

async function init() {
  initLang(cfg);
  const res = await fetch('data/sections.json', { cache: 'no-cache' });
  const data = await res.json();
  sections = SECTION_KEYS.map((k) => data.sections.find((s) => s.key === k));
  if (sections.some((s) => !s)) throw new Error('sections.json does not match the section keys');

  const urlSession = new URLSearchParams(location.search).get('session');
  const session = cleanSession(urlSession) || String(cfg.session || 'default');
  state = restoreState(session);
  if (urlSession && !state.submitted && cleanSession(urlSession)) state.session = cleanSession(urlSession);
  canStore = storageWorks();
  persist();

  initSender(cfg, {
    onSent(id) {
      if (id === joinId()) state.sent.join = true;
      if (id === submitId()) state.sent.submit = true;
      persist();
      renderSave();
    },
    onChange: renderSave,
  });

  wireLang();
  initNewsletter(cfg);
  wheels.intro = createWheel($('#intro-wheel'), { sections, lang: getLang(), mode: 'result', hubText: t('hub') });
  wheels.question = createWheel($('#q-wheel'), { sections, lang: getLang(), mode: 'question', hubText: t('hub'), naText: t('naShort') });
  wheels.review = createWheel($('#review-wheel'), { sections, lang: getLang(), mode: 'result', hubText: t('hub'), naText: t('naShort') });
  wheels.result = createWheel($('#result-wheel'), { sections, lang: getLang(), mode: 'result', hubText: t('hub'), naText: t('naShort') });
  wheels.question.onPick((v) => choose(v, true));

  bindEvents();
  onLangChange(() => {
    for (const w of Object.values(wheels)) w.update({ lang: getLang(), hubText: t('hub'), naText: t('naShort') });
    renderLangButton();
    render();
    relabelNewsletter();
  });
  window.addEventListener('popstate', () => {
    if (state.step === 'deep') go('result');
  });
  render(true);
}

function cleanSession(s) {
  const v = String(s || '').trim();
  return /^[\w-]{1,40}$/.test(v) ? v : '';
}

function persist() {
  canStore = saveState(state) && canStore;
}

// ---------- Screens ----------

function go(step, opts = {}) {
  state.step = step;
  persist();
  render(true, opts);
}

function show(name) {
  for (const s of document.querySelectorAll('[data-screen]')) s.hidden = s.dataset.screen !== name;
  document.body.dataset.step = name;
}

function render(moved = false, opts = {}) {
  applyText({ total: TOTAL, min: MIN_GROUP, year: new Date().getFullYear() });
  const name = typeof cfg.eventName === 'object' && cfg.eventName ? pick(cfg.eventName) : String(cfg.eventName || '');
  $('#event-name').textContent = name;
  $('#event-name').hidden = !name;

  show(state.step);
  // Official site: on the Intro, Result and Deep analytics screens (the progress counter needs the room while answering)
  $('#official-link').hidden = !['intro', 'result', 'deep'].includes(state.step);
  const onQuestion = state.step === 'question';
  $('#progress').hidden = !onQuestion;
  $('#progress-text').hidden = !onQuestion;

  if (state.step === 'intro') renderIntro();
  if (state.step === 'question') renderQuestion(opts);
  if (state.step === 'review') renderReview();
  if (state.step === 'result') renderResult();
  if (state.step === 'deep') renderDeep();

  if (moved) {
    window.scrollTo(0, 0);
    const h = document.querySelector(`[data-screen="${state.step}"] h1`);
    if (h && !opts.keepFocus) h.focus({ preventScroll: true });
  }
}

// 1. Intro and consent
function renderIntro() {
  wheels.intro.update({ answers: SECTION_KEYS.map(() => null) });
  $('#consent').checked = Boolean(state.consent);
  const started = state.consent && state.answers.some((a) => a !== null);
  $('#start-btn span').textContent = started ? t('intro.resume') : t('intro.start');
  $('#start-over').hidden = !started;
  $('#no-store').hidden = canStore;
}

// 2. One section
function renderQuestion(opts = {}) {
  const i = state.index;
  const s = sections[i];
  const label = pick(s.label);
  $('#q-title').textContent = label;
  $('#q-legend').textContent = t('q.options', { section: label });
  $('#progress-text').textContent = t('q.progress', { i: i + 1, total: TOTAL });
  $('#progress-text').setAttribute('aria-label', t('q.progressLabel', { i: i + 1, total: TOTAL }));
  $('#progress-bar').style.width = `${((i + 1) / TOTAL) * 100}%`;
  $('#q-error').hidden = true;

  const current = state.answers[i];
  const rings = $('#q-rings');
  rings.dataset.sec = s.key;
  rings.replaceChildren(
    ...RING_VALUES.map((v) => {
      const whole = Number.isInteger(v);
      const ringName = whole ? t(`ring.${v}`) : t('ring.between');
      const text = whole
        ? pick(s.rings[v])
        : t('opt.between', { a: pick(s.rings[Math.floor(v)]), b: pick(s.rings[Math.ceil(v)]) });
      return optionRow({
        value: String(v),
        text: whole ? text : t('opt.betweenShort'),
        tag: whole ? ringName : '',
        checked: current === v,
        aria: t('opt.aria', { section: label, ring: ringName.toLowerCase(), label: text }),
        cls: whole ? `opt--r${v}` : 'opt--half',
        icon: ringIcon(v),
      });
    }),
  );
  $('#q-na').replaceChildren(
    optionRow({
      value: NA,
      text: t('opt.na'),
      checked: current === NA,
      aria: t('opt.naAria', { section: label }),
      cls: 'opt--na',
      icon: naIcon(),
    }),
  );

  const last = i === TOTAL - 1;
  $('#q-next-text').textContent = state.fromReview ? t('q.toReview') : last ? t('q.review') : t('q.next');
  wheels.question.update({ answers: state.answers, active: i, animate: !opts.instant });
}

function optionRow({ value, text, tag, checked, aria, cls, icon }) {
  const label = document.createElement('label');
  label.className = `opt ${cls}`;
  const input = document.createElement('input');
  input.type = 'radio';
  input.name = 'answer';
  input.value = value;
  input.checked = checked;
  input.setAttribute('aria-label', aria);
  const box = document.createElement('span');
  box.className = 'opt__icon';
  box.setAttribute('aria-hidden', 'true');
  box.append(icon);
  const body = document.createElement('span');
  body.className = 'opt__body';
  const main = document.createElement('span');
  main.className = 'opt__text';
  main.textContent = text;
  body.append(main);
  if (tag) {
    const small = document.createElement('span');
    small.className = 'opt__tag';
    small.textContent = tag;
    body.append(small);
  }
  label.append(input, box, body);
  return label;
}

/** Small concentric-rings icon with the chosen ring (or boundary) filled, matching the wheel. */
function ringIcon(v) {
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 32 32');
  svg.setAttribute('class', 'ring-icon');
  const ring = (r, cls) => {
    const c = document.createElementNS(NS, 'circle');
    c.setAttribute('cx', 16);
    c.setAttribute('cy', 16);
    c.setAttribute('r', r);
    c.setAttribute('class', cls);
    svg.append(c);
  };
  // radii: outer ring 15, middle 10.5, centre 6, hub 2.2; the answer is a band at the matching radius
  ring(15, 'ri-r1');
  ring(10.5, 'ri-r2');
  ring(6, 'ri-r3');
  const r = 3.75 + (3 - v) * 4.5; // 3 → 3.75 … 1 → 12.75 (mid-lines of the rings)
  const band = document.createElementNS(NS, 'circle');
  band.setAttribute('cx', 16);
  band.setAttribute('cy', 16);
  band.setAttribute('r', r);
  band.setAttribute('class', 'ri-answer');
  svg.append(band);
  ring(2.2, 'ri-hub');
  return svg;
}

function naIcon() {
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('class', 'ring-icon ring-icon--na');
  const use = document.createElementNS(NS, 'use');
  use.setAttribute('href', '#i-minus');
  svg.append(use);
  return svg;
}

function choose(v, fromWheel = false) {
  state.answers[state.index] = v;
  persist();
  $('#q-error').hidden = true;
  wheels.question.update({ answers: state.answers });
  const input = document.querySelector(`#q-options input[value="${v}"]`);
  if (input) {
    input.checked = true;
    if (fromWheel) input.focus({ preventScroll: true });
  }
}

function nextQuestion() {
  const i = state.index;
  if (state.answers[i] === null) {
    $('#q-error').hidden = false;
    const first = document.querySelector('#q-options input');
    if (first) first.focus();
    return;
  }
  if (state.fromReview) {
    state.fromReview = false;
    go('review');
    return;
  }
  if (i === TOTAL - 1) {
    go('review');
    return;
  }
  state.index = i + 1;
  persist();
  renderQuestion();
  announce(`${pick(sections[state.index].label)}. ${t('q.progressLabel', { i: state.index + 1, total: TOTAL })}`);
  scrollQuestionIntoView();
}

function prevQuestion() {
  if (state.index === 0) {
    go('intro');
    return;
  }
  state.index -= 1;
  persist();
  renderQuestion();
  announce(`${pick(sections[state.index].label)}. ${t('q.progressLabel', { i: state.index + 1, total: TOTAL })}`);
  scrollQuestionIntoView();
}

function scrollQuestionIntoView() {
  if (window.scrollY > 0) window.scrollTo({ top: 0, behavior: reduceMotion() ? 'auto' : 'smooth' });
}

// 3. Review
function answerText(s, v) {
  if (v === NA) return t('review.na');
  if (v === null || v === undefined) return t('review.missing');
  if (Number.isInteger(v)) return `${pick(s.rings[v])} · ${t(`ring.${v}`)}`;
  return t('opt.between', { a: pick(s.rings[Math.floor(v)]), b: pick(s.rings[Math.ceil(v)]) });
}

function renderReview() {
  wheels.review.update({ answers: state.answers });
  const list = $('#review-list');
  list.replaceChildren(
    ...sections.map((s, i) => {
      const v = state.answers[i];
      const li = document.createElement('li');
      li.className = `review-row${v === null ? ' is-missing' : ''}${v === NA ? ' is-na' : ''}`;
      li.dataset.sec = s.key;
      const icon = document.createElement('span');
      icon.className = 'review-row__icon';
      icon.setAttribute('aria-hidden', 'true');
      icon.append(v === NA || v === null ? naIcon() : ringIcon(v));
      const body = document.createElement('div');
      body.className = 'review-row__body';
      const h = document.createElement('p');
      h.className = 'review-row__label';
      h.textContent = pick(s.label);
      const a = document.createElement('p');
      a.className = 'review-row__answer';
      a.textContent = answerText(s, v);
      body.append(h, a);
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'btn btn--small';
      btn.dataset.index = i;
      btn.setAttribute('aria-label', t('review.changeAria', { section: pick(s.label) }));
      btn.textContent = t('review.change');
      li.append(icon, body, btn);
      return li;
    }),
  );
  const ok = isComplete(state.answers);
  $('#review-note').textContent = ok ? t('review.final') : t('review.needAll');
  $('#review-note').classList.toggle('is-error', !ok);
  $('#submit-btn').setAttribute('aria-disabled', String(!ok));
}

function submit() {
  if (!isComplete(state.answers)) {
    $('#review-note').focus();
    const firstMissing = document.querySelector('.review-row.is-missing button');
    if (firstMissing) firstMissing.focus();
    return;
  }
  const score = scorePerson(state.answers);
  state.submitted = true;
  state.submittedAt = new Date().toISOString();
  persist();
  if (canSend()) {
    enqueue(submitId(), {
      type: 'submit',
      session: state.session,
      pid: state.pid,
      lang: getLang(),
      consent: true,
      answers: Object.fromEntries(SECTION_KEYS.map((k, i) => [k, state.answers[i]])),
      n: score.n,
      points: score.points,
      pct: score.pct,
      band: score.band || '',
    });
  }
  go('result');
}

// 4. Your wheel
function renderResult() {
  wheels.result.update({ answers: state.answers });
  const s = scorePerson(state.answers);
  const banded = Boolean(s.band);
  $('#score-value').textContent = banded ? fmtPct(s.pct) : '–';
  $('#score-value').classList.toggle('is-empty', !banded);
  $('#score-band').hidden = !banded;
  $('#score-band').className = `band-chip band-chip--${s.band || 'none'}`;
  $('#score-band').textContent = banded ? t('result.band', { band: t(`band.${s.band}`) }) : '';
  $('#score-few').hidden = banded;
  $('#score-n').textContent = t('result.answered', { n: s.n, total: TOTAL });
  renderScale($('#score-scale'), banded ? s.pct : null);

  const naList = sections.filter((_, i) => state.answers[i] === NA).map((x) => pick(x.label));
  $('#score-na').hidden = !naList.length;
  $('#score-na').textContent = naList.length ? t('result.naList', { list: naList.join(', ') }) : '';

  $('#withdraw-code').textContent = withdrawalCode(state.pid);
  $('#retake-btn').hidden = !cfg.allowRetake;
  renderSave();
}

/** The 0–100% line with the 70% and 90% zones and the person's marker (decorative; the numbers are in text). */
function renderScale(node, pct) {
  node.replaceChildren();
  const track = document.createElement('div');
  track.className = 'scale';
  for (const [cls, from, to] of [['low', 0, 70], ['mid', 70, 90], ['high', 90, 100]]) {
    const z = document.createElement('span');
    z.className = `scale__zone scale__zone--${cls}`;
    z.style.left = `${from}%`;
    z.style.width = `${to - from}%`;
    track.append(z);
  }
  if (pct !== null) {
    const m = document.createElement('span');
    m.className = 'scale__marker';
    m.style.left = `${pct}%`;
    track.append(m);
  }
  const ticks = document.createElement('div');
  ticks.className = 'scale__ticks';
  for (const v of [0, 70, 90]) {
    const tk = document.createElement('span');
    tk.style.left = `${v}%`;
    tk.textContent = `${v}%`;
    ticks.append(tk);
  }
  node.append(track, ticks);
}

function renderSave() {
  if (!state || state.step !== 'result') return;
  const el = $('#save-status');
  const retry = $('#save-retry');
  retry.hidden = true;
  el.className = 'save';
  if (!canSend()) {
    el.textContent = t('save.local');
    return;
  }
  if (!isQueued(submitId())) {
    el.textContent = t('save.saved');
    el.classList.add('is-saved');
  } else if (isSending()) {
    el.textContent = t('save.saving');
  } else {
    el.textContent = t('save.pending');
    el.classList.add('is-pending');
    retry.hidden = false;
  }
}

// 5. Deep analytics
// Fetched fresh each time the screen opens: more people finish during the workshop.
function renderDeep() {
  if (summary.status !== 'loading') loadSummary();
  else drawDeep();
}

async function loadSummary() {
  if (!cfg.endpoint) {
    summary = { status: 'offline', data: null };
    drawDeep();
    return;
  }
  summary = { status: 'loading', data: summary.data };
  drawDeep();
  try {
    const data = await fetchSummary(cfg, state.session);
    summary = { status: 'ready', data };
  } catch {
    summary = { status: 'error', data: null };
  }
  if (state.step === 'deep') drawDeep();
}

function drawDeep() {
  const status = $('#group-status');
  const retry = $('#group-retry');
  const d = summary.data;
  const enough = d && d.submitted >= MIN_GROUP && d.sections;
  retry.hidden = summary.status !== 'error';
  $('#legend-group').hidden = !enough;
  if (summary.status === 'loading' && !d) status.textContent = t('deep.loading');
  else if (summary.status === 'error') status.textContent = t('deep.error');
  else if (summary.status === 'offline') status.textContent = t('deep.offline');
  else if (!enough) status.textContent = t('deep.waiting', { min: MIN_GROUP });
  else status.textContent = t('deep.groupOf', { n: d.submitted });

  renderDotPlot($('#dotplot'), {
    sections,
    answers: state.answers,
    group: enough ? d : null,
    minGroup: MIN_GROUP,
    t,
    pick,
    fmtPct,
  });
}

// ---------- Events ----------

function bindEvents() {
  $('#consent-form').addEventListener('submit', (e) => {
    e.preventDefault();
    if (!$('#consent').checked) {
      $('#consent-error').hidden = false;
      $('#consent').focus();
      return;
    }
    state.consent = true;
    persist();
    if (canSend() && !state.sent.join) enqueue(joinId(), { type: 'join', session: state.session, pid: state.pid });
    if (state.answers.every((a) => a !== null)) go('review');
    else {
      if (state.answers[state.index] !== null) {
        const firstEmpty = state.answers.findIndex((a) => a === null);
        if (firstEmpty >= 0) state.index = firstEmpty;
      }
      go('question', { instant: true });
    }
  });
  $('#consent').addEventListener('change', () => {
    if ($('#consent').checked) $('#consent-error').hidden = true;
    else {
      state.consent = false;
      persist();
    }
  });
  $('#start-over').addEventListener('click', () => confirmDialog(() => {
    state = resetState(state, state.session);
    persist();
    render(true);
  }));

  $('#q-options').addEventListener('change', (e) => {
    if (e.target.name !== 'answer') return;
    const v = e.target.value === NA ? NA : Number(e.target.value);
    choose(v);
  });
  $('#q-next').addEventListener('click', nextQuestion);
  $('#q-back').addEventListener('click', prevQuestion);

  $('#review-list').addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-index]');
    if (!btn) return;
    state.index = Number(btn.dataset.index);
    state.fromReview = true;
    go('question', { instant: true });
  });
  $('#submit-btn').addEventListener('click', submit);

  $('#deep-btn').addEventListener('click', (e) => {
    e.preventDefault();
    history.pushState({ deep: true }, '', '#deep');
    go('deep');
  });
  $('#deep-back').addEventListener('click', () => {
    if (location.hash === '#deep') history.back();
    else go('result');
  });
  $('#group-retry').addEventListener('click', loadSummary);
  $('#save-retry').addEventListener('click', () => flush());
  $('#retake-btn').addEventListener('click', () => {
    state.submitted = false;
    go('review');
  });
}

function confirmDialog(onYes) {
  const dlg = $('#confirm-dialog');
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

// ---------- Language menu (flag button in the header, as in the values card sort) ----------

const NS = 'http://www.w3.org/2000/svg';
function svgUse(cls, href) {
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('class', cls);
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  const use = document.createElementNS(NS, 'use');
  use.setAttribute('href', href);
  svg.append(use);
  return svg;
}

function wireLang() {
  const langs = getLanguages();
  const box = $('#lang');
  box.hidden = langs.length < 2;
  if (box.hidden) return;

  const btn = $('#lang-btn');
  const menu = $('#lang-menu');
  menu.replaceChildren(
    ...langs.map((code) => {
      const li = document.createElement('li');
      const opt = document.createElement('button');
      opt.type = 'button';
      opt.className = 'lang__opt';
      opt.dataset.lang = code;
      opt.lang = code;
      const name = document.createElement('span');
      name.className = 'lang__name';
      name.textContent = LANG_NAMES[code] || code;
      opt.append(svgUse('flag', `#flag-${code}`), name, svgUse('icon', '#i-check'));
      li.append(opt);
      return li;
    }),
  );

  const isOpen = () => btn.getAttribute('aria-expanded') === 'true';
  const open = () => {
    btn.setAttribute('aria-expanded', 'true');
    menu.hidden = false;
    menu.querySelector(`.lang__opt[data-lang="${getLang()}"]`).focus();
  };
  const close = ({ focus = true } = {}) => {
    if (!isOpen()) return;
    btn.setAttribute('aria-expanded', 'false');
    menu.hidden = true;
    if (focus) btn.focus();
  };

  btn.addEventListener('click', () => (isOpen() ? close() : open()));
  menu.addEventListener('click', (e) => {
    const opt = e.target.closest('[data-lang]');
    if (!opt) return;
    setLang(opt.dataset.lang);
    close();
  });
  // Escape closes; arrow keys move between languages
  box.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isOpen()) {
      e.preventDefault();
      e.stopPropagation();
      close();
      return;
    }
    if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && isOpen()) {
      e.preventDefault();
      const opts = [...menu.querySelectorAll('.lang__opt')];
      const i = opts.indexOf(document.activeElement);
      opts[(i + (e.key === 'ArrowDown' ? 1 : -1) + opts.length) % opts.length].focus();
    }
  });
  // Clicking or tabbing anywhere else closes it
  document.addEventListener('pointerdown', (e) => {
    if (!box.contains(e.target)) close({ focus: false });
  });
  box.addEventListener('focusout', (e) => {
    if (e.relatedTarget && !box.contains(e.relatedTarget)) close({ focus: false });
  });

  renderLangButton();
}

function renderLangButton() {
  const code = getLang();
  $('#lang-btn-flag').setAttribute('href', `#flag-${code}`);
  $('#lang-btn-text').textContent = t('langButton', { name: LANG_NAMES[code] || code });
  for (const opt of document.querySelectorAll('.lang__opt')) {
    if (opt.dataset.lang === code) opt.setAttribute('aria-current', 'true');
    else opt.removeAttribute('aria-current');
  }
}

// ---------- Helpers ----------

function announce(text) {
  const n = $('#announce');
  n.textContent = '';
  setTimeout(() => {
    n.textContent = text;
  }, 50);
}

function reduceMotion() {
  return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

