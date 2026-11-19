// Test people from EXECUTION_PLAN.md §3 (and the scoring doc's 10-person worked example).
// Answers are in section order: skin, education, ability, sexuality, neuro, mental, body, housing,
// wealth, language, gender, citizenship.
const NA = 'NA';

export const PEOPLE = {
  P1: [3, 3, 3, 3, 2, 2, 2, 3, 2.5, 3, 2, 3],
  P2: [1, 3, 3, 3, 2, 1.5, 2.5, 2.5, 2, 1.5, 2, 3],
  P3: [NA, 2.5, 2.5, 3, 2, 1, 2, 2, 1.5, 2, 3, 3],
  P4: [2, 2, 3, 3, 3, 2, 2, 1.5, 1, 1, 2, 1],
  P5: [3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 2, 3],
  P6: [1, 1, 2, 1, 1, 1, 1.5, 1, 1, 1, 1, 1],
  P7: [2, 3, 3, NA, 2, 2, 1, 2, 2, 2, 3, NA],
  P8: [NA, NA, 3, NA, 3, NA, NA, NA, NA, NA, 2, NA],
  P9: [2.5, 3, 1.5, 2, 1, 2.5, 2, 2.5, 2, 2.5, 2, 3],
  P10: [2, 2.5, 3, 1, 2, 2, 2.5, 2, 1.5, 1.5, 2, 3],
};

// The doc's single-participant worked example: 11 of 12 sections, Skin colour N/A, 63.6%.
// ASSUMPTION: the doc's charts don't print the answers. These are read off its spider graph and chosen
// to total 25 points (63.6%). Ken to replace them with the doc's exact answers.
export const DOC_PARTICIPANT = [NA, 2.5, 3, 3, 2, 1, 2.5, 2, 1.5, 2.5, 2, 3];

// Expected values per person (pct to 2 decimals as in the plan's table).
export const EXPECTED = [
  ['P1', PEOPLE.P1, 12, 31.5, 81.25, 'mid'],
  ['P2', PEOPLE.P2, 12, 27, 62.5, 'low'],
  ['P3', PEOPLE.P3, 11, 24.5, 61.36, 'low'],
  ['P4', PEOPLE.P4, 12, 23.5, 47.92, 'low'],
  ['P5', PEOPLE.P5, 12, 35, 95.83, 'high'],
  ['P6', PEOPLE.P6, 12, 13.5, 6.25, 'low'],
  ['P7', PEOPLE.P7, 10, 22, 60.0, 'low'],
  ['P8', PEOPLE.P8, 3, 8, 83.33, null],
  ['P9', PEOPLE.P9, 12, 26.5, 60.42, 'low'],
  ['P10', PEOPLE.P10, 12, 25, 54.17, 'low'],
  ['All 1s', Array(12).fill(1), 12, 12, 0, 'low'],
  ['All 2s', Array(12).fill(2), 12, 24, 50, 'low'],
  ['All 3s, Skin NA', [NA, ...Array(11).fill(3)], 11, 33, 100, 'high'],
];
