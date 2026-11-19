// Participant flow: consent → 12 questions → review → submit → Your wheel → Deep analytics.
import { test, expect } from '@playwright/test';
import { sheet, resetSheet, seedDoc, watchExternal, start, answer, answerAll } from './helpers.mjs';
import { DOC_PARTICIPANT } from './fixtures.mjs';

test.beforeEach(async ({ request }) => {
  await resetSheet(request);
});

test('no consent, no answers', async ({ page, request }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Start' }).click();
  await expect(page.locator('#consent-error')).toBeVisible();
  await expect(page.locator('#consent')).toBeFocused();
  await expect(page.locator('[data-screen="question"]')).toBeHidden();
  expect((await sheet(request)).joins).toHaveLength(0);
  await expect(page.locator('.credit').first()).toContainText('Sylvia Duckworth');
});

test('full run: the doc participant gets 63.6%, the Sheet gets the server score', async ({ page, request, baseURL }) => {
  const external = watchExternal(page, baseURL);
  await start(page);
  await expect(page.locator('#q-title')).toHaveText('Skin colour');
  await expect(page.locator('#progress-text')).toHaveText('1 of 12');
  await answerAll(page, DOC_PARTICIPANT);

  // Review lists all 12 with Change buttons
  await expect(page.locator('.review-row')).toHaveCount(12);
  await expect(page.locator('.review-row').first()).toContainText('Not applicable');
  await expect(page.locator('.review-row').nth(1)).toContainText('Between “High school education” and “Post-secondary”');
  await page.locator('#submit-btn').click();

  await expect(page.locator('[data-screen="result"]')).toBeVisible();
  await expect(page.locator('#score-value')).toHaveText('63.6%');
  await expect(page.locator('#score-band')).toHaveText('Band: 70% and below');
  await expect(page.locator('#score-n')).toHaveText('11 of 12 sections answered');
  await expect(page.locator('#score-na')).toHaveText('Not applicable: Skin colour');
  await expect(page.locator('#save-status')).toHaveText('Answers sent');
  const code = await page.locator('#withdraw-code').textContent();
  expect(code).toMatch(/^[0-9A-F]{6}$/);

  // Result wheel: N/A slice + 11 answered slices
  await expect(page.locator('#result-wheel .wheel__slice.is-na')).toHaveCount(1);
  await expect(page.locator('#result-wheel .wheel__slice.is-answered')).toHaveCount(11);

  const state = await sheet(request);
  expect(state.joins).toHaveLength(1);
  expect(state.responses).toHaveLength(1);
  const row = state.responses[0];
  expect(row.n).toBe(11);
  expect(row.points).toBe(25);
  expect(row.pct).toBe(63.64); // the Sheet stores the server's score, rounded to 2 decimals
  expect(row.band).toBe('70% and below');
  expect(row.consent).toBe(true);
  expect(row.pid.replace(/-/g, '').slice(-6).toUpperCase()).toBe(code);
  expect(external).toEqual([]);
});

test('refresh mid-way keeps the answers', async ({ page }) => {
  await start(page);
  await answer(page, 3);
  await answer(page, 2.5);
  await answer(page, 'NA');
  await page.locator('#q-options input[value="1.5"]').check({ force: true });
  await page.reload();
  // Same question, same answer
  await expect(page.locator('#q-title')).toHaveText('Sexuality');
  await expect(page.locator('#q-options input[value="1.5"]')).toBeChecked();
  await page.locator('#q-back').click();
  await expect(page.locator('#q-options input[value="NA"]')).toBeChecked();
});

test('Next needs an answer; keyboard and accessible names work', async ({ page }) => {
  await start(page);
  await page.locator('#q-next').click();
  await expect(page.locator('#q-error')).toBeVisible();
  await expect(page.locator('#q-title')).toHaveText('Skin colour');
  // Accessible names as in the plan ("Wealth: middle ring")
  await expect(page.getByRole('radio', { name: 'Skin colour: middle ring, Different shades' })).toBeVisible();
  await expect(page.getByRole('radio', { name: 'Skin colour: not applicable to me' })).toBeVisible();
  // Arrow keys move through the options
  await page.getByRole('radio', { name: /Skin colour: outer ring/ }).focus();
  await page.keyboard.press('ArrowDown');
  await expect(page.locator('#q-options input[value="1.5"]')).toBeChecked();
  await expect(page.locator('#q-error')).toBeHidden();
  await page.keyboard.press('ArrowDown');
  await expect(page.locator('#q-options input[value="2"]')).toBeChecked();
});

test('tapping the wheel picks the nearest ring or boundary', async ({ page }) => {
  await start(page);
  // Wait for the rotation to finish, then tap points along the active (top) slice
  await page.waitForTimeout(900);
  const box = await page.locator('#q-wheel svg').boundingBox();
  const scale = box.width / 410; // viewBox is 410 wide, centre at (205, 205)
  const at = (r) => ({ x: box.x + 205 * scale, y: box.y + (205 - r) * scale });
  const tap = async (r) => {
    const p = at(r);
    await page.mouse.click(p.x, p.y);
  };
  await tap(149); // outer ring middle
  await expect(page.locator('#q-options input[value="1"]')).toBeChecked();
  await tap(103); // middle ring
  await expect(page.locator('#q-options input[value="2"]')).toBeChecked();
  await tap(80); // boundary middle/centre
  await expect(page.locator('#q-options input[value="2.5"]')).toBeChecked();
  await tap(57); // centre ring
  await expect(page.locator('#q-options input[value="3"]')).toBeChecked();
  await expect(page.locator('#q-wheel .wheel__slice.is-active.is-answered')).toHaveCount(1);
});

test('the wheel rotates the current section to the top, instantly with reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await start(page);
  const spin = page.locator('#q-wheel .wheel__spin');
  await expect(spin).toHaveAttribute('style', /rotate\(-15deg\)/);
  expect(await spin.evaluate((n) => getComputedStyle(n).transitionDuration)).toBe('0s');
  await answer(page, 2);
  await expect(page.locator('#q-title')).toHaveText('Formal education');
  await expect(spin).toHaveAttribute('style', /rotate\(-45deg\)/);
});

test('fewer than 9 sections: no % and no band', async ({ page }) => {
  await start(page);
  await answerAll(page, ['NA', 'NA', 3, 'NA', 3, 'NA', 'NA', 'NA', 'NA', 'NA', 2, 'NA']);
  await page.locator('#submit-btn').click();
  await expect(page.locator('#score-few')).toHaveText('Answer at least 9 sections to see an overall score.');
  await expect(page.locator('#score-band')).toBeHidden();
  await expect(page.locator('#score-value')).toHaveText('–');
  await expect(page.locator('#score-n')).toHaveText('3 of 12 sections answered');
});

test('changing an answer from the review goes back to the list', async ({ page }) => {
  await start(page);
  await answerAll(page, Array(12).fill(2));
  await page.getByRole('button', { name: 'Change Wealth' }).click();
  await expect(page.locator('#q-title')).toHaveText('Wealth');
  await page.locator('#q-options input[value="1"]').check({ force: true });
  await page.locator('#q-next').click(); // "Back to the list"
  await expect(page.locator('[data-screen="review"]')).toBeVisible();
  await expect(page.locator('.review-row').nth(8)).toContainText('Poor · Outer ring');
});

test('deep analytics hides group ticks under 5 people, shows them from 5', async ({ page, request }) => {
  await start(page);
  await answerAll(page, DOC_PARTICIPANT);
  await page.locator('#submit-btn').click();
  await page.getByRole('link', { name: 'Deep analytics' }).click();
  await expect(page.locator('#group-status')).toHaveText('Group averages appear once 5 people have taken part.');
  await expect(page.locator('.dp-dot')).toHaveCount(11);
  await expect(page.locator('.dp-tick')).toHaveCount(0);
  await expect(page.locator('.dp-row.is-na')).toHaveCount(1);

  await seedDoc(request); // + the doc's 10 people = 11
  await page.locator('#deep-back').click();
  await page.getByRole('link', { name: 'Deep analytics' }).click();
  await expect(page.locator('#group-status')).toHaveText('Group: 11 people so far.');
  await expect(page.locator('.dp-tick')).toHaveCount(11); // every answered row except Skin colour (N/A for this person)
  // The phone's back button returns to the wheel; a reload keeps the screen
  await page.reload();
  await expect(page.locator('#group-status')).toHaveText('Group: 11 people so far.');
  await page.goBack();
  await expect(page.locator('[data-screen="result"]')).toBeVisible();
});

test('French: the page and the wheel switch language, answers stay language-neutral', async ({ page, request }) => {
  await start(page);
  await page.getByRole('button', { name: 'Language: English' }).click();
  await page.getByRole('button', { name: 'Français' }).click();
  await expect(page.getByRole('button', { name: 'Langue : Français' })).toBeVisible();
  await expect(page.locator('#q-title')).toHaveText('Couleur de peau');
  await expect(page.locator('#q-next')).toContainText('Suivant');
  await expect(page.locator('#q-wheel .wheel__hub-text')).toHaveText('POUVOIR');
  await answerAll(page, DOC_PARTICIPANT);
  await page.locator('#submit-btn').click();
  await expect(page.locator('#score-value')).toHaveText(/63,6\s?%/);
  const row = (await sheet(request)).responses[0];
  expect(row.lang).toBe('fr');
  expect(row.skin).toBe('NA');
});

test('answers wait on the phone while offline and are sent later', async ({ page, request }) => {
  await start(page);
  await answerAll(page, Array(12).fill(3));
  await request.post('/__test/outage?on=1');
  await page.locator('#submit-btn').click();
  await expect(page.locator('#save-status')).toHaveText('Not sent yet, we’ll keep trying');
  await request.post('/__test/outage?on=0');
  await page.locator('#save-retry').click();
  await expect(page.locator('#save-status')).toHaveText('Answers sent');
  expect((await sheet(request)).responses).toHaveLength(1);
});
