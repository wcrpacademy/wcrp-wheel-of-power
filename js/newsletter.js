// Newsletter sign-up (same form as the values card sort; Ken, 19 Nov 2026). The one part of this app that
// takes personal data. The form goes straight to MailerLite through the Apps Script, which holds the API key.
// Nothing from it is stored on the phone or in the Google Sheet, and it is never sent with or linked to the
// wheel answers (no pid, no session, no withdrawal code).
import { COUNTRIES, OTHER_COUNTRY } from './countries.js';
import { endpointUrl, postJson } from './endpoint.js';
import { getLang, t, choiceLabel } from './i18n.js';

// Same choices as the sign-up form on wcrp-academy.org. The English text is what MailerLite receives,
// whatever the page language; only the label shown is translated (i18n.js CHOICE_LABELS).
const LANGUAGES = ['English', 'French', 'Spanish', 'Portuguese', 'Arabic', 'Chinese', 'Russian', 'Other'];
const ROLES = ['NGO member', 'Undergraduate', 'Postgraduate', 'Researcher'];
const TOPICS = [
  'Climate Change Impacts Adaptation and Vulnerability',
  'Mitigation of Climate Change',
  'Physical Science Basis of Climate Change',
];

const DONE_KEY = 'wcrp-wheel-newsletter-done'; // only a yes/no flag, never the details
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const $ = (sel) => document.querySelector(sel);

let cfg;
let busy = false;

export function initNewsletter(config) {
  cfg = config;
  if (cfg.newsletterSignup === false) {
    $('#newsletter').hidden = true;
    return;
  }
  fillChoices();
  renderCta();

  const dialog = $('#nl-dialog');
  $('#newsletter-open').addEventListener('click', open);
  $('#nl-close').addEventListener('click', () => dialog.close());
  for (const btn of document.querySelectorAll('[data-nl-close]')) btn.addEventListener('click', () => dialog.close());
  $('#nl-form').addEventListener('submit', submit);
  dialog.addEventListener('close', renderCta);
}

function fillChoices() {
  fillCountries();
  $('#nl-language').append(...LANGUAGES.map((v) => new Option(choiceLabel(v), v)));
  const boxes = (wrap, name, list) =>
    wrap.append(
      ...list.map((v) => {
        const label = document.createElement('label');
        label.className = 'check-line';
        const input = document.createElement('input');
        input.type = 'checkbox';
        input.name = name;
        input.value = v;
        const text = document.createElement('span');
        text.className = 'check-line__text';
        text.textContent = choiceLabel(v);
        label.append(input, text);
        return label;
      }),
    );
  boxes($('#nl-roles'), 'roles', ROLES);
  boxes($('#nl-topics'), 'topics', TOPICS);
}

/** Countries in the page language, sorted in that language; "Other" last. The value stays English. */
function fillCountries() {
  const select = $('#nl-country');
  const chosen = select.value;
  const lang = getLang();
  let names = null;
  if (lang !== 'en' && typeof Intl.DisplayNames === 'function') {
    try {
      names = new Intl.DisplayNames([lang], { type: 'region' });
    } catch {
      names = null;
    }
  }
  const label = ([code, en]) => (names && names.of(code)) || en;
  const sorted = [...COUNTRIES].map((c) => [label(c), c[1]]).sort((a, b) => a[0].localeCompare(b[0], lang));
  // Keep the "Select your country" placeholder (first option)
  select.replaceChildren(
    select.options[0],
    ...sorted.map(([text, value]) => new Option(text, value)),
    new Option(choiceLabel(OTHER_COUNTRY), OTHER_COUNTRY),
  );
  select.value = chosen;
}

/** After a language change: translate the choices without losing what is already filled in. */
export function relabelNewsletter() {
  if (!cfg || cfg.newsletterSignup === false) return;
  fillCountries();
  for (const opt of $('#nl-language').options) if (opt.value) opt.text = choiceLabel(opt.value);
  for (const input of document.querySelectorAll('#nl-roles input, #nl-topics input')) {
    input.parentElement.querySelector('.check-line__text').textContent = choiceLabel(input.value);
  }
  for (const key of ['first', 'last', 'email', 'consent']) {
    const err = $(`#nl-${key}-error`);
    if (err.dataset.key) err.textContent = t(err.dataset.key);
  }
  const general = $('#nl-general-text');
  if (general.dataset.key) general.textContent = t(general.dataset.key);
  setBusy(busy);
}

function isDone() {
  try {
    return localStorage.getItem(DONE_KEY) === '1';
  } catch {
    return false;
  }
}

/** Footer: the button, or a thank-you once this phone has signed up. */
function renderCta() {
  const done = isDone();
  $('#newsletter-open').hidden = done;
  $('#newsletter-thanks').hidden = !done;
}

/** The real endpoint is always https; http only for the local test server on this computer. */
function canSend() {
  const url = endpointUrl(cfg);
  return /^https:\/\//.test(url) || /^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?\//.test(url);
}

function open() {
  const ok = canSend();
  $('#nl-form').hidden = !ok;
  $('#nl-offline').hidden = ok;
  $('#nl-done').hidden = true;
  setGeneral('');
  $('#nl-dialog').showModal();
  // Land on the title, not a field, so the keyboard doesn't jump up on phones
  (ok ? $('#nl-title') : $('#nl-offline-title')).focus();
}

function read() {
  const form = $('#nl-form');
  const val = (name) => String(form.elements[name].value || '').trim();
  const checked = (name) => [...form.querySelectorAll(`input[name="${name}"]:checked`)].map((i) => i.value);
  return {
    first_name: val('first_name').slice(0, 60),
    last_name: val('last_name').slice(0, 60),
    email: val('email').toLowerCase().slice(0, 254),
    country: val('country'),
    language: val('language'),
    affiliation: val('affiliation').slice(0, 120),
    roles: checked('roles'),
    topics: checked('topics'),
    consent: form.elements.consent.checked,
    website: val('website'), // spam trap
  };
}

function validate(d) {
  const errors = [];
  if (!d.first_name) errors.push(['first', 'nl.errFirst']);
  if (!d.last_name) errors.push(['last', 'nl.errLast']);
  if (!d.email) errors.push(['email', 'nl.errEmail']);
  else if (!EMAIL.test(d.email)) errors.push(['email', 'nl.errEmailBad']);
  if (!d.consent) errors.push(['consent', 'nl.errConsent']);
  return errors;
}

/** msgKey: an i18n.js key, or '' to clear. The key is kept so a language change can translate the message. */
function setFieldError(key, msgKey) {
  const msg = msgKey ? t(msgKey) : '';
  const input = $(`#nl-${key}`);
  const err = $(`#nl-${key}-error`);
  err.dataset.key = msgKey;
  err.textContent = msg;
  err.hidden = !msg;
  if (msg) {
    input.setAttribute('aria-invalid', 'true');
    input.setAttribute('aria-describedby', err.id);
  } else {
    input.removeAttribute('aria-invalid');
    input.removeAttribute('aria-describedby');
  }
}

function setGeneral(msgKey) {
  const node = $('#nl-general-text');
  node.dataset.key = msgKey;
  node.textContent = msgKey ? t(msgKey) : '';
  $('#nl-general').hidden = !msgKey;
}

async function submit(e) {
  e.preventDefault();
  if (busy) return;
  const d = read();
  const errors = validate(d);
  for (const key of ['first', 'last', 'email', 'consent']) {
    const hit = errors.find(([k]) => k === key);
    setFieldError(key, hit ? hit[1] : '');
  }
  setGeneral('');
  if (errors.length) {
    $(`#nl-${errors[0][0]}`).focus();
    return;
  }
  if (!navigator.onLine) {
    setGeneral('nl.errOffline');
    return;
  }

  setBusy(true);
  try {
    const reply = await postJson(endpointUrl(cfg), { type: 'newsletter', ...d });
    if (reply && reply.ok === true) {
      done();
      return;
    }
    if (reply && reply.error === 'bad_email') {
      setFieldError('email', 'nl.errRefused');
      $('#nl-email').focus();
      return;
    }
    setGeneral('nl.errLater');
  } catch {
    setGeneral('nl.errLater');
  } finally {
    setBusy(false);
  }
}

function setBusy(on) {
  busy = on;
  const btn = $('#nl-submit');
  btn.textContent = t(on ? 'nl.submitting' : 'nl.submit');
  btn.setAttribute('aria-disabled', String(on));
}

function done() {
  try {
    localStorage.setItem(DONE_KEY, '1');
  } catch {
    /* storage blocked: the footer just keeps its button */
  }
  $('#nl-form').reset(); // don't keep anyone's details on screen
  $('#nl-form').hidden = true;
  $('#nl-done').hidden = false;
  $('#nl-done-title').focus();
}
