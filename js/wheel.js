// The wheel: our own SVG drawing (EXECUTION_PLAN.md §0 Artwork, §4 screens 2 and 4).
// 12 slices × 3 rings + a hub. Ring 3 (centre) = closest to power, ring 1 (outer) = marginalised.
//
//   const wheel = createWheel(el, { sections, lang, mode: 'question' | 'result' })
//   wheel.update({ answers, active, lang })   answers: array in section order (number | "NA" | null)
//   wheel.onPick(fn)                          question mode: fn(value) when the active slice is tapped
//
// Question mode rotates the wheel so the active slice sits at the top (CSS transform; instant with
// prefers-reduced-motion). Result mode keeps the reference orientation: Skin colour just right of the top.
// The SVG is decorative for screen readers (aria-hidden); the page gives the same choices as real radios.

const NS = 'http://www.w3.org/2000/svg';
const SLICE = 30; // degrees per section
const R_HUB = 34;
const RING_W = 46;
// Radius of each ring's mid line: ring 3 (centre) → 57, 2 → 103, 1 (outer) → 149.
const ringMid = (v) => R_HUB + RING_W / 2 + (3 - v) * RING_W;
const R_OUT = R_HUB + 3 * RING_W; // 172
const R_LABEL = 186;

let uid = 0;

function el(name, attrs = {}, parent) {
  const node = document.createElementNS(NS, name);
  for (const [k, v] of Object.entries(attrs)) if (v !== undefined && v !== null) node.setAttribute(k, v);
  if (parent) parent.appendChild(node);
  return node;
}

/** Point at angle a (degrees clockwise from the top) and radius r. */
function pt(a, r) {
  const rad = (a * Math.PI) / 180;
  return [r * Math.sin(rad), -r * Math.cos(rad)];
}
const f = (n) => Math.round(n * 100) / 100;

/** Ring sector between radii r0 < r1 and angles a0 < a1. */
function sector(r0, r1, a0, a1) {
  const [x0, y0] = pt(a0, r1);
  const [x1, y1] = pt(a1, r1);
  const [x2, y2] = pt(a1, r0);
  const [x3, y3] = pt(a0, r0);
  const large = a1 - a0 > 180 ? 1 : 0;
  if (r0 <= 0) return `M0 0 L${f(x0)} ${f(y0)} A${r1} ${r1} 0 ${large} 1 ${f(x1)} ${f(y1)} Z`;
  return `M${f(x0)} ${f(y0)} A${r1} ${r1} 0 ${large} 1 ${f(x1)} ${f(y1)} L${f(x2)} ${f(y2)} A${r0} ${r0} 0 ${large} 0 ${f(x3)} ${f(y3)} Z`;
}

/** Arc for text: clockwise (reads left to right across the top) or reversed (across the bottom). */
function arc(r, a0, a1, reversed) {
  const [x0, y0] = pt(reversed ? a1 : a0, r);
  const [x1, y1] = pt(reversed ? a0 : a1, r);
  return `M${f(x0)} ${f(y0)} A${r} ${r} 0 0 ${reversed ? 0 : 1} ${f(x1)} ${f(y1)}`;
}

const norm = (a) => ((a % 360) + 360) % 360;
const reduceMotion = () => window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export function createWheel(container, { sections, lang = 'en', mode = 'result', hubText = 'POWER', naText = 'N/A' }) {
  const id = `w${++uid}`;
  const svg = el('svg', {
    class: `wheel wheel--${mode}`,
    viewBox: '-205 -205 410 410',
    'aria-hidden': 'true',
    focusable: 'false',
  });

  const defs = el('defs', {}, svg);
  const hatch = el('pattern', { id: `${id}-na`, width: 8, height: 8, patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(45)' }, defs);
  el('rect', { width: 8, height: 8, class: 'wheel__na-bg' }, hatch);
  el('line', { x1: 0, y1: 0, x2: 0, y2: 8, class: 'wheel__na-line' }, hatch);

  const spin = el('g', { class: 'wheel__spin' }, svg);
  // Layers, bottom to top: slices (cells, answer, N/A), ring lines, markers + active outline, tap targets, labels
  const layerSlices = el('g', {}, spin);
  const layerLines = el('g', { class: 'wheel__lines' }, spin);
  const layerTop = el('g', { class: 'wheel__top' }, spin);
  const layerHits = el('g', {}, spin);
  const layerLabels = el('g', {}, spin);

  const slices = sections.map((s, i) => {
    const a0 = i * SLICE;
    const a1 = a0 + SLICE;
    const g = el('g', { class: 'wheel__slice', 'data-key': s.key, 'data-sec': s.key, 'data-index': i }, layerSlices);
    const cells = [1, 2, 3].map((ring) =>
      el('path', { class: `wheel__cell wheel__cell--r${ring}`, d: sector(ringMid(ring) - RING_W / 2, ringMid(ring) + RING_W / 2, a0, a1) }, g),
    );
    const na = el('path', { class: 'wheel__na', d: sector(R_HUB, R_OUT, a0, a1), fill: `url(#${id}-na)` }, g);
    const fill = el('path', { class: 'wheel__answer' }, g);
    const naLabelPos = pt(a0 + SLICE / 2, ringMid(2));
    const naLabel = el('text', { class: 'wheel__na-text', x: f(naLabelPos[0]), y: f(naLabelPos[1]) }, g);
    naLabel.textContent = naText;
    const marker = el('circle', { class: 'wheel__marker', r: 7 }, layerTop);
    const hit = el('path', { class: 'wheel__hit', 'data-index': i, d: sector(R_HUB, R_OUT + 4, a0, a1) }, layerHits);
    const arcs = [false, true].map((rev, k) =>
      el('path', { id: `${id}-arc${i}-${k}`, d: arc(R_LABEL, a0 - 6, a1 + 6, rev), fill: 'none' }, defs),
    );
    const label = el('text', { class: 'wheel__label' }, layerLabels);
    const tp = el('textPath', { href: `#${arcs[0].id}`, startOffset: '50%' }, label);
    return { s, a0, a1, g, cells, na, naLabel, fill, marker, hit, label, tp, arcs, naLabelPos };
  });
  const outline = el('path', { class: 'wheel__outline' }, layerTop);

  // Spokes and ring lines drawn over the cells
  for (const r of [R_HUB + RING_W, R_HUB + 2 * RING_W]) el('circle', { r, class: 'wheel__ring-line' }, layerLines);
  el('circle', { r: R_OUT, class: 'wheel__rim' }, layerLines);
  for (let i = 0; i < 12; i++) {
    const [x0, y0] = pt(i * SLICE, R_HUB);
    const [x1, y1] = pt(i * SLICE, R_OUT);
    el('line', { x1: f(x0), y1: f(y0), x2: f(x1), y2: f(y1), class: 'wheel__spoke' }, layerLines);
  }

  // Hub stays upright (outside the spinning group)
  el('circle', { r: R_HUB, class: 'wheel__hub' }, svg);
  const hub = el('text', { class: 'wheel__hub-text', x: 0, y: 0 }, svg);
  hub.textContent = hubText;

  container.replaceChildren(svg);

  let angle = 0;
  let active = -1;
  let answers = sections.map(() => null);
  let pickFn = null;

  function setAngle(target, animate) {
    // Shortest way round from the current angle
    let next = target;
    while (next - angle > 180) next -= 360;
    while (angle - next > 180) next += 360;
    spin.classList.toggle('is-instant', !animate || reduceMotion());
    angle = next;
    spin.style.transform = `rotate(${angle}deg)`;
    // Labels on the lower half of the screen read along a reversed arc so they stay upright.
    for (const sl of slices) {
      const screen = norm(sl.a0 + SLICE / 2 + angle);
      const lower = screen > 90 && screen < 270;
      sl.tp.setAttribute('href', `#${sl.arcs[lower ? 1 : 0].id}`);
      // Keep the N/A text upright too
      sl.naLabel.setAttribute('transform', `rotate(${-angle} ${f(sl.naLabelPos[0])} ${f(sl.naLabelPos[1])})`);
    }
  }

  function draw() {
    slices.forEach((sl, i) => {
      const v = answers[i];
      const isNa = v === 'NA';
      const has = typeof v === 'number';
      sl.g.classList.toggle('is-active', i === active);
      sl.g.classList.toggle('is-na', isNa);
      sl.g.classList.toggle('is-answered', has);
      sl.label.classList.toggle('is-active', i === active);
      sl.label.classList.toggle('is-na', isNa);
      sl.marker.classList.toggle('is-shown', has);
      sl.hit.classList.toggle('is-active', i === active);
      sl.marker.classList.toggle('is-dim', active >= 0 && i !== active);
      if (has) {
        const r = ringMid(v);
        sl.fill.setAttribute('d', sector(r - RING_W / 2, r + RING_W / 2, sl.a0, sl.a1));
        const [x, y] = pt(sl.a0 + SLICE / 2, r);
        sl.marker.setAttribute('cx', f(x));
        sl.marker.setAttribute('cy', f(y));
      } else {
        sl.fill.removeAttribute('d');
      }
    });
    svg.classList.toggle('has-active', active >= 0);
    if (active >= 0) outline.setAttribute('d', sector(R_HUB, R_OUT, slices[active].a0, slices[active].a1));
    else outline.removeAttribute('d');
  }

  // Tap on the active slice: nearest of the 5 positions (rings and the boundaries between them).
  svg.addEventListener('click', (e) => {
    if (!pickFn || active < 0) return;
    const hitSlice = e.target.closest && e.target.closest('.wheel__hit');
    if (!hitSlice || Number(hitSlice.dataset.index) !== active) return;
    const ctm = svg.getScreenCTM();
    if (!ctm) return;
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(ctm.inverse());
    const r = Math.hypot(p.x, p.y);
    if (r < R_HUB || r > R_OUT + 4) return;
    let v = 3 - (r - ringMid(3)) / RING_W;
    v = Math.min(3, Math.max(1, Math.round(v * 2) / 2));
    pickFn(v);
  });

  function setLabels(nextLang) {
    slices.forEach((sl) => {
      sl.tp.textContent = (sl.s.short && sl.s.short[nextLang]) || sl.s.label[nextLang] || sl.s.label.en;
    });
  }

  setLabels(lang);
  setAngle(0, false);

  return {
    svg,
    update(opts = {}) {
      if (opts.answers) answers = opts.answers.slice();
      if (opts.lang) setLabels(opts.lang);
      if (opts.hubText) hub.textContent = opts.hubText;
      if (opts.naText) for (const sl of slices) sl.naLabel.textContent = opts.naText;
      if (typeof opts.active === 'number') {
        const changed = opts.active !== active;
        active = opts.active;
        if (mode === 'question' && (changed || opts.forceAngle)) {
          setAngle(-(active * SLICE + SLICE / 2), opts.animate !== false);
        }
      }
      draw();
    },
    onPick(fn) {
      pickFn = fn;
    },
  };
}
