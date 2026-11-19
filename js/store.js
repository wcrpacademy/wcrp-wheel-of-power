// Draft on the phone (localStorage) so a refresh mid-way keeps the answers. Every read and write is in
// try/catch: with blocked storage the page still works in memory.
import { SECTION_KEYS, normaliseAnswer } from './scoring.js';

export const KEY = 'wcrp-wheel-v1';
export const STEPS = ['intro', 'question', 'review', 'result', 'deep'];

/** Random UUID; falls back to getRandomValues outside secure contexts. */
export function uuid() {
  if (globalThis.crypto && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

/** The withdrawal code: the last 6 characters of the pid, upper case (EXECUTION_PLAN.md §7). */
export const withdrawalCode = (pid) => String(pid || '').replace(/-/g, '').slice(-6).toUpperCase();

/** A fresh draft. The pid and the join flag survive "Start over", so the joined counter never counts a phone twice. */
export function newState(session, pid = uuid(), joinSent = false) {
  return {
    v: 1,
    pid,
    session,
    consent: false,
    step: 'intro',
    index: 0,
    fromReview: false,
    answers: SECTION_KEYS.map(() => null),
    submitted: false,
    submittedAt: '',
    sent: { join: joinSent, submit: false },
  };
}

export function resetState(old, session) {
  return newState(session, old.pid, Boolean(old.sent && old.sent.join));
}

/** The draft to continue with, or a new one. A damaged draft is dropped (pid kept when readable). */
export function restoreState(session) {
  let s;
  try {
    s = JSON.parse(localStorage.getItem(KEY));
  } catch {
    s = null;
  }
  if (!s || typeof s !== 'object' || typeof s.pid !== 'string' || !s.pid) return newState(session);
  if (s.v !== 1 || !Array.isArray(s.answers) || s.answers.length !== SECTION_KEYS.length || !STEPS.includes(s.step)) {
    return resetState(s, session);
  }
  s.answers = s.answers.map(normaliseAnswer);
  if (!Number.isInteger(s.index) || s.index < 0 || s.index >= SECTION_KEYS.length) s.index = 0;
  if (!s.sent || typeof s.sent !== 'object') s.sent = { join: false, submit: false };
  if (!s.consent) s.step = 'intro';
  if (s.submitted && (s.step === 'question' || s.step === 'review' || s.step === 'intro')) s.step = 'result';
  if (!s.submitted && (s.step === 'result' || s.step === 'deep')) s.step = 'review';
  if (typeof s.session !== 'string' || !s.session) s.session = session;
  return s;
}

/** Returns false when storage is unavailable. */
export function saveState(s) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
    return true;
  } catch {
    return false;
  }
}

export function storageWorks() {
  try {
    const k = `${KEY}-probe`;
    localStorage.setItem(k, '1');
    localStorage.removeItem(k);
    return true;
  } catch {
    return false;
  }
}

/** Removes everything this app keeps on the phone (organiser "Reset this phone"). */
export function clearPhone() {
  try {
    for (const k of Object.keys(localStorage)) if (k.startsWith('wcrp-wheel')) localStorage.removeItem(k);
  } catch {
    /* nothing to clear */
  }
}
