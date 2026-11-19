// Save queue: the "join" ping and the submission. Same pattern as the values card sort.
// Every item stays on the phone (localStorage) until the Apps Script replies {ok:true}. It is retried every
// 15 s, when the phone comes back online and when the page is opened again. Each item has its own id and
// the Apps Script ignores repeated joins and replaces a pid's earlier row, so retries never duplicate rows.
import { endpointUrl, postJson } from './endpoint.js';

const KEY = 'wcrp-wheel-outbox-v1';
const RETRY_MS = 15000;

let cfg;
let outbox = [];
let running = null;
let timer = 0;
let hooks = { onSent() {}, onChange() {} };

export function initSender(config, h = {}) {
  cfg = config;
  hooks = { ...hooks, ...h };
  outbox = load();
  window.addEventListener('online', () => flush());
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') flush();
  });
  flush();
}

/** False when config.js has no endpoint: answers then stay on the phone only. */
export const canSend = () => Boolean(endpointUrl(cfg));
export const isSending = () => running !== null;
export const isQueued = (id) => outbox.some((e) => e.id === id);

export function enqueue(id, body) {
  outbox = outbox.filter((e) => e.id !== id); // a newer body for the same id replaces the old one
  outbox.push({ id, body, queuedAt: new Date().toISOString() });
  save();
  return flush();
}

/** Drop everything waiting (organiser "Reset this phone"). */
export function clearOutbox() {
  outbox = [];
  save();
}

/** Send everything waiting, oldest first. Safe to call often: only one run at a time. */
export function flush() {
  if (running) return running;
  const url = endpointUrl(cfg);
  if (!url || !outbox.length) return Promise.resolve();
  clearTimeout(timer);
  timer = 0;

  running = (async () => {
    for (const item of [...outbox]) {
      let reply;
      try {
        reply = await postJson(url, item.body);
      } catch {
        break; // offline, timed out or no receiver: try again later
      }
      if (reply && reply.ok === true) {
        outbox = outbox.filter((e) => e.id !== item.id);
        save();
        hooks.onSent(item.id, reply);
      }
    }
  })().finally(() => {
    running = null;
    if (outbox.length) timer = setTimeout(flush, RETRY_MS);
    hooks.onChange();
  });
  hooks.onChange();
  return running;
}

function load() {
  try {
    const list = JSON.parse(localStorage.getItem(KEY));
    return Array.isArray(list) ? list.filter((e) => e && typeof e.id === 'string' && e.body && typeof e.body === 'object') : [];
  } catch {
    return [];
  }
}

function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(outbox));
  } catch {
    /* storage blocked: the queue still works while the page is open */
  }
}
