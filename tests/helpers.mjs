// Shared helpers for the Playwright specs.
import { expect } from '@playwright/test';

export const sheet = async (request) => (await request.get('/__test/state')).json();
export const resetSheet = (request) => request.post('/__test/reset');
export const seedDoc = (request) => request.post('/__test/seed?set=doc');

/** Records every request that leaves the test server (must stay empty: no external requests). */
export function watchExternal(page, baseURL) {
  const external = [];
  page.on('request', (r) => {
    const url = r.url();
    if (!url.startsWith(baseURL) && !url.startsWith('data:') && !url.startsWith('blob:')) external.push(url);
  });
  return external;
}

/** Fresh page → tick consent → first question. */
export async function start(page) {
  await page.goto('/');
  await expect(page.locator('[data-screen="intro"]')).toBeVisible();
  await page.locator('label.check').click();
  await page.getByRole('button', { name: 'Start' }).click();
  await expect(page.locator('[data-screen="question"]')).toBeVisible();
}

/** Picks an answer on the current question (number or "NA") and moves on. */
export async function answer(page, value) {
  await page.locator(`#q-options input[value="${value}"]`).check({ force: true });
  await page.locator('#q-next').click();
}

export async function answerAll(page, values) {
  for (const v of values) await answer(page, v);
  await expect(page.locator('[data-screen="review"]')).toBeVisible();
}
