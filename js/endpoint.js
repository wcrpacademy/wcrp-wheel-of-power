// Network helpers for the Apps Script web app (config.js `endpoint`).
// POSTs go as text/plain (a "simple" request, so Apps Script needs no CORS preflight).

export const endpointUrl = (cfg) => String((cfg && cfg.endpoint) || '');

/** GET JSON with query parameters, never from the browser cache. Rejects on failure or a non-JSON reply. */
export async function getJson(url, params = {}, timeoutMs = 10000) {
  const u = new URL(url, location.href);
  for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v);
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(u, { cache: 'no-store', credentials: 'omit', referrerPolicy: 'no-referrer', signal: ctrl.signal });
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

/** POST JSON as text/plain and read the JSON reply. Rejects on failure, timeout or a non-JSON reply. */
export async function postJson(url, body, timeoutMs = 15000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(body),
      credentials: 'omit',
      referrerPolicy: 'no-referrer',
      signal: ctrl.signal,
    });
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

/** The group summary for a session (aggregates only). Resolves to the reply, or rejects. */
export async function fetchSummary(cfg, session) {
  const url = endpointUrl(cfg);
  if (!url) throw new Error('no endpoint');
  const reply = await getJson(url, { type: 'summary', session });
  if (!reply || reply.ok !== true) throw new Error('bad reply');
  return reply;
}
