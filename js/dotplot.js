// Deep analytics (option C): the section dot plot (EXECUTION_PLAN.md §4 screen 5).
// One row per section with zones for the outer, middle and centre ring. A blue dot = the person's answer;
// a grey tick = the group average (mean ring of the people who answered that section, NA excluded).
// Group ticks are hidden below minGroup submissions, and per section below minGroup answers
// (ASSUMPTION: the per-section rule is ours, so a section answered by 1–4 people never shows their answers).
import { NA, ringToPct } from './scoring.js';

/** Ring value (1–3) → x position in % of the track: ring 1 at the middle of the outer zone, 3 at the centre zone. */
export const xOf = (v) => ((v - 0.5) / 3) * 100;

export function renderDotPlot(node, { sections, answers, group, minGroup, t, pick, fmtPct }) {
  const head = document.createElement('div');
  head.className = 'dp-head';
  head.setAttribute('aria-hidden', 'true');
  head.innerHTML = '<span></span>';
  const zones = document.createElement('div');
  zones.className = 'dp-zones-head';
  for (const k of ['outer', 'middle', 'centre']) {
    const s = document.createElement('span');
    s.textContent = t(`deep.${k}`);
    zones.append(s);
  }
  head.append(zones);

  const list = document.createElement('ul');
  list.className = 'dp-list';
  sections.forEach((s, i) => {
    const v = answers[i];
    const g = group && group.sections ? group.sections[s.key] : null;
    const showGroup = Boolean(g && g.mean !== null && g.mean !== undefined && g.n >= minGroup);

    const li = document.createElement('li');
    li.className = `dp-row${v === NA ? ' is-na' : ''}`;
    li.dataset.sec = s.key;

    const label = document.createElement('div');
    label.className = 'dp-label';
    const name = document.createElement('span');
    name.className = 'dp-name';
    name.textContent = pick(s.label);
    label.append(name);
    if (group && g) {
      const n = document.createElement('span');
      n.className = 'dp-n';
      n.textContent = showGroup ? t('deep.n', { n: g.n, total: group.submitted }) : t('deep.few');
      n.setAttribute('aria-hidden', 'true');
      label.append(n);
    }

    const track = document.createElement('div');
    track.className = 'dp-track';
    track.setAttribute('aria-hidden', 'true');
    for (const z of ['r1', 'r2', 'r3']) {
      const zone = document.createElement('span');
      zone.className = `dp-zone dp-zone--${z}`;
      track.append(zone);
    }
    if (v === NA) {
      const na = document.createElement('span');
      na.className = 'dp-na';
      na.textContent = t('deep.na');
      track.append(na);
    } else {
      if (showGroup) {
        const tick = document.createElement('span');
        tick.className = 'dp-tick';
        tick.style.left = `${xOf(g.mean)}%`;
        track.append(tick);
      }
      if (typeof v === 'number') {
        const dot = document.createElement('span');
        dot.className = 'dp-dot';
        dot.style.left = `${xOf(v)}%`;
        track.append(dot);
      }
    }

    // Screen readers get the same row as a sentence.
    const sr = document.createElement('p');
    sr.className = 'visually-hidden';
    const you = v === NA ? t('deep.na') : t(`val.${v}`);
    let text = `${pick(s.label)}. ${t('deep.srYou', { value: you })}`;
    if (showGroup && v !== NA) {
      const mean = Math.round(g.mean * 100) / 100;
      text += ` ${t('deep.srGroup', { value: t('val.mean', { ring: mean, pct: fmtPct(ringToPct(g.mean), 0) }), n: g.n, total: group.submitted })}`;
    }
    sr.textContent = text;

    li.append(label, track, sr);
    list.append(li);
  });

  node.replaceChildren(head, list);
}
