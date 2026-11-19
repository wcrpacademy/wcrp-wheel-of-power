// Accessibility: axe (WCAG 2.2 AA rules) on every screen. Fails on serious or critical issues.
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { resetSheet, seedDoc, start, answerAll } from './helpers.mjs';
import { DOC_PARTICIPANT } from './fixtures.mjs';

async function check(page, name) {
  const { violations } = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze();
  const bad = violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
  const summary = bad.map((v) => `${name}: ${v.id} (${v.impact}) ${v.nodes.map((n) => n.target.join(' ')).slice(0, 3).join(' | ')}`);
  expect(summary).toEqual([]);
}

test.beforeEach(async ({ request }) => {
  await resetSheet(request);
  await seedDoc(request);
});

test('participant screens have no serious axe issues', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('[data-screen="intro"]')).toBeVisible();
  await check(page, 'intro');
  await start(page);
  await page.waitForTimeout(800);
  await check(page, 'question');
  await answerAll(page, DOC_PARTICIPANT);
  await check(page, 'review');
  await page.locator('#submit-btn').click();
  await expect(page.locator('#save-status')).toHaveText('Answers sent');
  await check(page, 'result');
  await page.getByRole('link', { name: 'Deep analytics' }).click();
  await expect(page.locator('.dp-tick').first()).toBeVisible();
  await check(page, 'deep');
});

test('/live and /admin have no serious axe issues', async ({ page }) => {
  await page.goto('/live');
  await expect(page.locator('#results')).toBeVisible();
  await check(page, 'live');
  await page.getByRole('button', { name: 'Sections' }).click();
  await check(page, 'live sections');
  await page.goto('/admin');
  await check(page, 'admin pin');
  await page.fill('#pin', '1234');
  await page.getByRole('button', { name: 'Open' }).click();
  await page.getByRole('button', { name: 'Load report' }).click();
  await expect(page.locator('#report')).toBeVisible();
  await check(page, 'admin report');
});

test('newsletter dialog and language menu have no serious axe issues', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Language: English' }).click();
  await check(page, 'language menu');
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Join the newsletter' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Subscribe' }).click();
  await check(page, 'newsletter with errors');
});
