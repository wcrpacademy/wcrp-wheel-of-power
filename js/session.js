// Which workshop session /live and /admin show: ?session=… in the URL, else the one chosen on /admin for
// this device, else config.js `session`. Participants' phones use config.js (or a ?session=… link).
const KEY = 'wcrp-wheel-admin-session';

export const cleanSession = (s) => {
  const v = String(s || '').trim();
  return /^[\w-]{1,40}$/.test(v) ? v : '';
};

export function viewSession(cfg) {
  const fromUrl = cleanSession(new URLSearchParams(location.search).get('session'));
  if (fromUrl) return fromUrl;
  try {
    const saved = cleanSession(localStorage.getItem(KEY));
    if (saved) return saved;
  } catch {
    /* storage blocked */
  }
  return cleanSession(cfg.session) || 'default';
}

/** Save (or clear, with '') the session this device's /live and /admin show. */
export function setViewSession(value) {
  try {
    if (value) localStorage.setItem(KEY, value);
    else localStorage.removeItem(KEY);
  } catch {
    /* storage blocked: lasts until reload */
  }
}
