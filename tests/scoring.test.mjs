// Unit tests for js/scoring.js (EXECUTION_PLAN.md §3). Run: npm run test:unit
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import {
  scorePerson, summarise, bandFor, normaliseAnswer, isComplete, ringToPct, BAND_LABELS, SECTION_KEYS,
} from '../js/scoring.js';
import { toGs } from '../scripts/sync-scoring-gs.mjs';
import { PEOPLE, EXPECTED, DOC_PARTICIPANT } from './fixtures.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const round = (x, d) => Math.round(x * 10 ** d) / 10 ** d;
const people10 = Object.values(PEOPLE);

for (const [name, answers, n, points, pct, band] of EXPECTED) {
  test(`test vector ${name}`, () => {
    const s = scorePerson(answers);
    assert.equal(s.n, n);
    assert.equal(s.points, points);
    assert.equal(round(s.pct, 2), pct);
    assert.equal(s.band, band);
  });
}

test('band labels match the plan', () => {
  assert.equal(BAND_LABELS[scorePerson(PEOPLE.P1).band], '70–90%');
  assert.equal(BAND_LABELS[scorePerson(PEOPLE.P5).band], '90% and above');
  assert.equal(BAND_LABELS[scorePerson(PEOPLE.P2).band], '70% and below');
});

test('band edges: exactly 90% is high, exactly 70% is low, under 9 sections is not banded', () => {
  // n = 10: 90% = 28 points, 70% = 24 points
  assert.equal(bandFor(10, 28), 'high');
  assert.equal(bandFor(10, 27.5), 'mid');
  assert.equal(bandFor(10, 24), 'low');
  assert.equal(bandFor(10, 24.5), 'mid');
  // n = 12: 90% = 33.6 points (not reachable), 33.5 is 89.58%
  assert.equal(bandFor(12, 33.5), 'mid');
  assert.equal(bandFor(12, 34), 'high');
  assert.equal(bandFor(8, 24), null);
  assert.equal(bandFor(9, 27), 'high');
});

test('the doc participant scores 63.6% on 11 of 12 sections', () => {
  const s = scorePerson(DOC_PARTICIPANT);
  assert.equal(s.n, 11);
  assert.equal(s.pct.toFixed(1), '63.6');
  assert.equal(s.band, 'low');
});

test('group summary of P1–P10 matches the doc', () => {
  const g = summarise(people10);
  assert.equal(g.submitted, 10);
  assert.equal(g.banded, 9);
  assert.equal(g.groupPct.toFixed(1), '58.9');
  assert.deepEqual(g.bands, { high: 1, mid: 1, low: 7 });
  assert.equal(g.notBanded, 1);
  assert.deepEqual(g.coverage, { answered: 108, possible: 120 });
  assert.equal(g.answeredAll, 7);
  assert.equal(g.pcts.length, 9);
});

test('per-section averages match the doc', () => {
  const { sections } = summarise(people10);
  // [key, mean ring (2 dp), POMP % (0 dp), n] from the doc's per-section chart
  const expected = [
    ['ability', 2.7, 85, 10],
    ['education', 2.56, 78, 9],
    ['citizenship', 2.5, 75, 8],
    ['sexuality', 2.38, 69, 8],
    ['housing', 2.17, 58, 9], // the doc's chart prints 59%, but 19.5 / 9 = 2.17 = 58.3% (flagged for Ken)
    ['gender', 2.1, 55, 10],
    ['neuro', 2.1, 55, 10],
    ['skin', 2.06, 53, 8],
    ['body', 2.06, 53, 9],
    ['language', 1.94, 47, 9],
    ['mental', 1.89, 44, 9],
    ['wealth', 1.83, 42, 9],
  ];
  for (const [key, mean, pct, n] of expected) {
    const s = sections[key];
    assert.equal(s.n, n, `${key} n`);
    assert.equal(round(s.mean, 2), mean, `${key} mean`);
    assert.equal(Math.round(s.pct), pct, `${key} pct`);
    assert.equal(s.na, 10 - n, `${key} na`);
  }
});

test('answers are validated', () => {
  assert.equal(normaliseAnswer('2.5'), 2.5);
  assert.equal(normaliseAnswer('na'), 'NA');
  assert.equal(normaliseAnswer('N/A'), 'NA');
  assert.equal(normaliseAnswer(1.75), null);
  assert.equal(normaliseAnswer(0), null);
  assert.equal(normaliseAnswer(''), null);
  assert.equal(isComplete(PEOPLE.P8), true);
  assert.equal(isComplete([...PEOPLE.P1.slice(0, 11), null]), false);
  const asObject = Object.fromEntries(SECTION_KEYS.map((k, i) => [k, PEOPLE.P3[i]]));
  assert.deepEqual(scorePerson(asObject), scorePerson(PEOPLE.P3));
});

test('ring to % on the rescaled scale', () => {
  assert.deepEqual([1, 1.5, 2, 2.5, 3].map(ringToPct), [0, 25, 50, 75, 100]);
});

test('apps-script/scoring.gs is the same code as js/scoring.js', () => {
  const js = readFileSync(join(ROOT, 'js', 'scoring.js'), 'utf8');
  const gs = readFileSync(join(ROOT, 'apps-script', 'scoring.gs'), 'utf8');
  assert.equal(gs, toGs(js), 'run `npm run gs` after changing js/scoring.js');

  // And it runs as plain script (as Apps Script loads it) with the same results.
  const ctx = vm.createContext({});
  vm.runInContext(gs, ctx);
  const s = vm.runInContext('scorePerson', ctx)(PEOPLE.P3);
  assert.equal(round(s.pct, 2), 61.36);
  const g = vm.runInContext('summarise', ctx)(people10);
  assert.equal(g.groupPct.toFixed(1), '58.9');
});
