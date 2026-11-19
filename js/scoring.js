// Wheel of Power scoring (EXECUTION_PLAN.md §3). Pure: no DOM, no imports, no browser or Google APIs.
//
// The same code runs in the browser and in Apps Script. apps-script/scoring.gs is this file with every
// leading `export ` removed (run `npm run gs`); tests/scoring.test.mjs fails if the two copies differ.
//
// Answers are ring values 1 (outer ring, marginalised), 1.5, 2 (middle), 2.5, 3 (centre, closest to power)
// or "NA" (not applicable). Scores are rescaled (POMP): ring 1 = 0%, ring 3 = 100%, NA leaves the total.

export const SECTION_KEYS = [
  'skin', 'education', 'ability', 'sexuality', 'neuro', 'mental',
  'body', 'housing', 'wealth', 'language', 'gender', 'citizenship',
];
export const RING_VALUES = [1, 1.5, 2, 2.5, 3];
export const NA = 'NA';
export const MIN_SECTIONS_FOR_BAND = 9;
export const BAND_KEYS = ['high', 'mid', 'low'];
// Stored and exported labels (language-neutral keys above; the pages translate them).
export const BAND_LABELS = { high: '90% and above', mid: '70–90%', low: '70% and below' };

/** A stored answer from any input ("2.5", 2.5, "na", "N/A"): a ring value, "NA", or null when invalid. */
export function normaliseAnswer(v) {
  if (v === null || v === undefined || v === '') return null;
  if (typeof v === 'string') {
    const s = v.trim().toUpperCase();
    if (s === 'NA' || s === 'N/A') return NA;
    v = Number(s);
  }
  if (typeof v !== 'number' || !isFinite(v)) return null;
  return RING_VALUES.indexOf(v) === -1 ? null : v;
}

/** Answers as an array in section order. Accepts an array or an object keyed by section key. */
export function answerList(answers) {
  if (Array.isArray(answers)) return SECTION_KEYS.map((_, i) => normaliseAnswer(answers[i]));
  const a = answers || {};
  return SECTION_KEYS.map((k) => normaliseAnswer(a[k]));
}

/** True when every one of the 12 sections has a valid answer (a ring value or NA). */
export function isComplete(answers) {
  return answerList(answers).every((v) => v !== null);
}

/**
 * One person's score.
 *   n      = sections that are not NA
 *   points = sum of their ring values
 *   pct    = (points - n) / (2n) × 100, unrounded (null when n = 0)
 *   band   = "high" | "mid" | "low", or null when n < 9 ("not banded")
 * Unanswered (null) sections count as NA here; the pages only score complete answers.
 */
export function scorePerson(answers) {
  const list = answerList(answers);
  let n = 0;
  let points = 0;
  for (const v of list) {
    if (typeof v === 'number') {
      n += 1;
      points += v;
    }
  }
  const pct = n ? ((points - n) / (2 * n)) * 100 : null;
  return { n, points, pct, band: bandFor(n, points) };
}

/**
 * The band, decided in whole numbers so a score of exactly 90% or 70% never lands on the wrong side
 * through floating-point error. half = 2 × (points - n) is a whole number because answers move in halves;
 * pct = half × 25 / n, so pct >= 90 ⇔ half × 5 >= 18n and pct > 70 ⇔ half × 5 > 14n.
 */
export function bandFor(n, points) {
  if (n < MIN_SECTIONS_FOR_BAND) return null;
  const half = Math.round((points - n) * 2);
  if (half * 5 >= 18 * n) return 'high';
  if (half * 5 > 14 * n) return 'mid';
  return 'low';
}

/** Ring value → % on the rescaled scale (1 → 0, 2 → 50, 3 → 100). */
export function ringToPct(ring) {
  return ((ring - 1) / 2) * 100;
}

/**
 * Group summary from a list of people's answers (each an array or an object keyed by section).
 *   submitted     people
 *   banded        people with a band (n >= 9); groupPct is the mean pct of these only
 *   bands         { high, mid, low } counts; notBanded = submitted - banded
 *   pcts          the banded people's pct values, sorted low to high (no ids: the order says nothing)
 *   coverage      { answered, possible }: non-NA answers out of 12 × submitted
 *   answeredAll   people with no NA
 *   sections      per section key: { n, na, mean (ring, null when n = 0), pct (POMP of the mean), counts }
 */
export function summarise(people) {
  const out = {
    submitted: 0,
    banded: 0,
    notBanded: 0,
    bands: { high: 0, mid: 0, low: 0 },
    groupPct: null,
    pcts: [],
    coverage: { answered: 0, possible: 0 },
    answeredAll: 0,
    sections: {},
  };
  const sums = SECTION_KEYS.map(() => 0);
  const ns = SECTION_KEYS.map(() => 0);
  const counts = SECTION_KEYS.map(() => ({ 1: 0, 1.5: 0, 2: 0, 2.5: 0, 3: 0 }));

  for (const answers of people || []) {
    const list = answerList(answers);
    const s = scorePerson(list);
    out.submitted += 1;
    out.coverage.possible += SECTION_KEYS.length;
    out.coverage.answered += s.n;
    if (s.n === SECTION_KEYS.length) out.answeredAll += 1;
    if (s.band) {
      out.banded += 1;
      out.bands[s.band] += 1;
      out.pcts.push(s.pct);
    }
    list.forEach((v, i) => {
      if (typeof v === 'number') {
        sums[i] += v;
        ns[i] += 1;
        counts[i][v] += 1;
      }
    });
  }

  out.notBanded = out.submitted - out.banded;
  out.pcts.sort((a, b) => a - b);
  if (out.pcts.length) out.groupPct = out.pcts.reduce((a, b) => a + b, 0) / out.pcts.length;
  SECTION_KEYS.forEach((k, i) => {
    const mean = ns[i] ? sums[i] / ns[i] : null;
    out.sections[k] = {
      n: ns[i],
      na: out.submitted - ns[i],
      mean,
      pct: mean === null ? null : ringToPct(mean),
      counts: counts[i],
    };
  });
  return out;
}
