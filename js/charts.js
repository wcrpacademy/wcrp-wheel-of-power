// Group charts for /live (projector) and /admin (report). Plain SVG, no library, no external requests.
//   renderBandStrip  one anonymous dot per banded person on a 0–100% line, the 70% and 90% zones shaded,
//                    a count in each band, the group % marked. Rescaled scale only.
//   renderSectionBars group average per section (POMP %), with n, sorted high to low; middle ring marked.
// Neither chart ever shows an id, a name, a ranking of people or a sorted list of people.
import { ringToPct } from './scoring.js';

const NS = 'http://www.w3.org/2000/svg';
function el(name, attrs = {}, parent, text) {
  const n = document.createElementNS(NS, name);
  for (const [k, v] of Object.entries(attrs)) if (v !== undefined && v !== null) n.setAttribute(k, v);
  if (text !== undefined) n.textContent = text;
  if (parent) parent.appendChild(n);
  return n;
}
const fmt = (x, d = 1) => `${(Math.round(x * 10 ** d) / 10 ** d).toFixed(d)}%`;

export const BAND_ZONES = [
  { key: 'low', from: 0, to: 70, label: '70% and below' },
  { key: 'mid', from: 70, to: 90, label: '70–90%' },
  { key: 'high', from: 90, to: 100, label: '90% and above' },
];

/** Stack dots so none overlap: each dot takes the lowest free row at its x. Returns [{x, row}]. */
export function stackDots(xs, minGap) {
  const rows = [];
  return [...xs]
    .sort((a, b) => a - b)
    .map((x) => {
      let row = 0;
      while (rows[row] !== undefined && x - rows[row] < minGap) row += 1;
      rows[row] = x;
      return { x, row };
    });
}

/**
 * Band strip.
 *   data: { pcts: number[], bands: {high, mid, low}, notBanded, groupPct, submitted }
 *   opts: { theme: 'dark' | 'light', title }
 */
export function renderBandStrip(node, data, opts = {}) {
  const W = 1000;
  const padX = 30;
  const plotW = W - padX * 2;
  const x = (p) => padX + (Math.max(0, Math.min(100, p)) / 100) * plotW;
  const r = 11;
  const dots = stackDots(data.pcts || [], (2 * r + 3) / plotW * 100).map((d) => ({ ...d, cx: x(d.x) }));
  const maxRow = dots.reduce((m, d) => Math.max(m, d.row), 0);
  const countsY = 40;
  const top = 80;
  const stripH = Math.max(90, (maxRow + 1) * (2 * r + 4) + 30);
  const axisY = top + stripH;
  const H = axisY + 70;

  const svg = el('svg', {
    class: `bandstrip bandstrip--${opts.theme || 'light'}`,
    viewBox: `0 0 ${W} ${H}`,
    role: 'img',
    'aria-label': bandStripText(data),
  });

  for (const z of BAND_ZONES) {
    el('rect', { class: `bs-zone bs-zone--${z.key}`, x: x(z.from), y: top, width: x(z.to) - x(z.from), height: stripH }, svg);
    const cx = (x(z.from) + x(z.to)) / 2;
    const n = data.bands ? data.bands[z.key] : 0;
    el('text', { class: 'bs-count', x: cx, y: countsY }, svg, String(n));
    el('text', { class: 'bs-zone-label', x: cx, y: countsY + 28 }, svg, z.label);
  }
  // Cut-off lines
  for (const p of [70, 90]) el('line', { class: 'bs-cut', x1: x(p), x2: x(p), y1: top, y2: axisY }, svg);

  // Group % marker
  if (typeof data.groupPct === 'number') {
    el('line', { class: 'bs-group', x1: x(data.groupPct), x2: x(data.groupPct), y1: top - 6, y2: axisY + 6 }, svg);
  }

  // Dots, bottom up
  for (const d of dots) el('circle', { class: 'bs-dot', cx: d.cx, cy: axisY - 14 - d.row * (2 * r + 4), r }, svg);

  // Axis
  el('line', { class: 'bs-axis', x1: padX, x2: W - padX, y1: axisY, y2: axisY }, svg);
  for (const p of [0, 25, 50, 70, 90, 100]) {
    el('line', { class: 'bs-tick', x1: x(p), x2: x(p), y1: axisY, y2: axisY + 8 }, svg);
    el('text', { class: 'bs-tick-label', x: x(p), y: axisY + 30 }, svg, `${p}%`);
  }
  if (typeof data.groupPct === 'number') {
    const gx = x(data.groupPct);
    el('text', { class: 'bs-group-label', x: gx, y: axisY + 58, 'text-anchor': gx > W - 160 ? 'end' : gx < 160 ? 'start' : 'middle' }, svg, `Group ${fmt(data.groupPct)}`);
  }
  node.replaceChildren(svg);
}

export function bandStripText(data) {
  const b = data.bands || { high: 0, mid: 0, low: 0 };
  const parts = [`90% and above: ${b.high}`, `70–90%: ${b.mid}`, `70% and below: ${b.low}`];
  if (data.notBanded) parts.push(`not banded: ${data.notBanded}`);
  const g = typeof data.groupPct === 'number' ? ` Group position ${fmt(data.groupPct)}.` : '';
  return `Closeness to power, one dot per person. ${parts.join('; ')}.${g}`;
}

/**
 * Section bars.
 *   sections: [{ key, label: {en}, short: {en} }] in section order
 *   stats:    { key: { n, mean } } (mean null = hidden: too few answers)
 *   total:    people who submitted
 */
export function renderSectionBars(node, sections, stats, total, opts = {}) {
  const rows = sections
    .map((s) => ({ s, st: stats[s.key] || { n: 0, mean: null } }))
    .map((r) => ({ ...r, pct: r.st.mean === null || r.st.mean === undefined ? null : ringToPct(r.st.mean) }))
    .sort((a, b) => (b.pct ?? -1) - (a.pct ?? -1));
  const shown = rows.filter((r) => r.pct !== null);
  const hi = shown.length ? shown[0].pct : null;
  const lo = shown.length ? shown[shown.length - 1].pct : null;

  const W = 1000;
  const labelW = 210;
  const valueW = 170;
  const plotW = W - labelW - valueW;
  const rowH = 44;
  const top = 34;
  const H = top + rows.length * rowH + 40;
  const x = (p) => labelW + (p / 100) * plotW;

  const svg = el('svg', { class: `secbars secbars--${opts.theme || 'light'}`, viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': sectionBarsText(rows, total) });
  // Grid
  for (const p of [0, 25, 50, 75, 100]) {
    el('line', { class: p === 50 ? 'sb-mid' : 'sb-grid', x1: x(p), x2: x(p), y1: top - 8, y2: top + rows.length * rowH }, svg);
    el('text', { class: 'sb-tick', x: x(p), y: top + rows.length * rowH + 28 }, svg, `${p}%`);
  }
  el('text', { class: 'sb-mid-label', x: x(50), y: top - 14 }, svg, 'middle ring');

  rows.forEach((r, i) => {
    const y = top + i * rowH;
    el('text', { class: 'sb-label', x: labelW - 14, y: y + rowH / 2 }, svg, r.s.label.en);
    if (r.pct === null) {
      el('text', { class: 'sb-none', x: labelW + 8, y: y + rowH / 2 }, svg, 'too few answers');
    } else {
      const extreme = shown.length > 1 && (r.pct === hi || r.pct === lo);
      el('rect', { class: `sb-bar${extreme ? ' is-extreme' : ''}`, x: labelW, y: y + 8, width: Math.max(2, x(r.pct) - labelW), height: rowH - 16, rx: 3 }, svg);
      el('text', { class: `sb-value${extreme ? ' is-extreme' : ''}`, x: W - valueW + 16, y: y + rowH / 2 }, svg, `${Math.round(r.pct)}%`);
    }
    el('text', { class: 'sb-n', x: W - 6, y: y + rowH / 2 }, svg, `n = ${r.st.n} of ${total}`);
  });
  node.replaceChildren(svg);
}

function sectionBarsText(rows, total) {
  const list = rows.map((r) => `${r.s.label.en} ${r.pct === null ? 'too few answers' : `${Math.round(r.pct)}%`} (n = ${r.st.n} of ${total})`);
  return `Group average per section, closeness to power. ${list.join('; ')}.`;
}
