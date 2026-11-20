// Projector (/live) and organiser (/admin) views, seeded with the doc's 10 example people.
import { test, expect } from '@playwright/test';
import { sheet, resetSheet, seedDoc, start, answerAll } from './helpers.mjs';

test.beforeEach(async ({ request }) => {
  await resetSheet(request);
});

test('/live waits for 5 people, then shows the doc numbers and no individuals', async ({ page, request }) => {
  await page.goto('/live');
  await expect(page.locator('#waiting')).toBeVisible();
  await expect(page.locator('#joined')).toHaveText('0');

  await seedDoc(request);
  await page.reload();
  await expect(page.locator('#results')).toBeVisible();
  await expect(page.locator('#joined')).toHaveText('10');
  await expect(page.locator('#submitted')).toHaveText('10');
  await expect(page.locator('#group-pct')).toHaveText('58.9%');
  await expect(page.locator('#headnote')).toHaveText('9 of 10 people included · 1 answered fewer than 9 sections');
  await expect(page.locator('.bs-dot')).toHaveCount(9);
  await expect(page.locator('.bs-count')).toHaveText(['7', '1', '1']);
  await expect(page.locator('.bandstrip')).toHaveAttribute('aria-label', /90% and above: 1; 70–90%: 1; 70% and below: 7; not banded: 1/);

  await page.getByRole('button', { name: 'Sections' }).click();
  await expect(page.locator('.sb-label').first()).toHaveText('Ability');
  await expect(page.locator('.sb-value').first()).toHaveText('85%');
  await expect(page.locator('.sb-label').last()).toHaveText('Wealth');
  await expect(page.locator('.sb-value').last()).toHaveText('42%');

  const html = await page.content();
  expect(html).not.toContain('seed-');
});

test('/live join QR: big while waiting, full screen on click, small in the corner with results', async ({ page, request }) => {
  await page.goto('/live');
  const big = page.locator('#waiting [data-qr-open]');
  await expect(big).toBeVisible();
  await expect(big.locator('img')).toHaveAttribute('src', 'qr/join.svg');
  const svg = await request.get('/qr/join.svg');
  expect(svg.ok()).toBe(true);
  expect(svg.headers()['content-type']).toContain('image/svg+xml');
  await expect.poll(() => big.locator('img').evaluate((img) => img.complete)).toBe(true);
  expect((await big.locator('img').boundingBox()).width).toBeGreaterThan(150);
  await expect(page.locator('#waiting .join-url')).toHaveText('wheelpower.wcrp-academy.org');

  await big.click();
  const full = page.locator('#qr-full');
  await expect(full).toBeVisible();
  await expect(full).toContainText('Scan to join');
  await page.keyboard.press('Escape');
  await expect(full).toBeHidden();
  await expect(big).toBeFocused();

  await seedDoc(request);
  await page.reload();
  await expect(page.locator('#results')).toBeVisible();
  await expect(page.locator('#corner-join [data-qr-open]')).toBeVisible();

  // Another session on this screen: no QR (it would open the default session), the address carries the session
  await page.goto('/live?session=TEST1');
  await expect(page.locator('#waiting [data-qr-open]')).toBeHidden();
  await expect(page.locator('#waiting .join-url')).toHaveText('wheelpower.wcrp-academy.org/?session=TEST1');
});

test('/admin: PIN, report, CSV without pid, delete by code', async ({ page, request }) => {
  await seedDoc(request);
  // One real participant to delete later
  await start(page);
  await answerAll(page, Array(12).fill(2));
  await page.locator('#submit-btn').click();
  const code = (await page.locator('#withdraw-code').textContent()).trim();

  await page.goto('/admin');
  await page.fill('#pin', '0000');
  await page.getByRole('button', { name: 'Open' }).click();
  await expect(page.locator('#pin-error')).toHaveText('That PIN is not right.');
  await page.fill('#pin', '1234');
  await page.getByRole('button', { name: 'Open' }).click();
  await expect(page.locator('#stat-submitted')).toHaveText('11');

  // CSV: no pid, no timestamp
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download anonymised CSV' }).click();
  const file = await (await download).path();
  const { readFile } = await import('node:fs/promises');
  const csv = (await readFile(file, 'utf8')).replace(new RegExp('^' + String.fromCharCode(0xfeff)), '');
  const [header, ...rows] = csv.trim().split('\n');
  expect(header).toBe('session,lang,skin,education,ability,sexuality,neuro,mental,body,housing,wealth,language,gender,citizenship,n,points,pct,band');
  expect(rows).toHaveLength(11);
  expect(csv).not.toMatch(/seed-|[0-9a-f]{8}-[0-9a-f]{4}-/);

  // Delete the participant by code → back to the doc's 10
  await page.fill('#delete-code', code);
  await page.getByRole('button', { name: 'Delete' }).click();
  await page.locator('#confirm-ok').click();
  await expect(page.locator('#delete-status')).toHaveText('Deleted 1 row.');
  expect((await sheet(request)).responses).toHaveLength(10);

  // Report matches the doc and /live
  await page.getByRole('button', { name: 'Load report' }).click();
  const headline = page.locator('#t-headline tbody');
  await expect(headline).toContainText('108 of 120 answers (90%)');
  await expect(headline).toContainText('7 of 10 people');
  await expect(headline).toContainText('9 of 10');
  await expect(headline).toContainText('58.9% rescaled');
  await expect(page.locator('#t-bands tbody td')).toHaveText(['1', '1', '7', '1']);
  const ability = page.locator('#t-sections tbody tr', { hasText: 'Ability' });
  await expect(ability.locator('td').nth(0)).toHaveText('2.70');
  await expect(ability.locator('td').nth(1)).toHaveText('85%');
  await expect(ability.locator('td').nth(2)).toHaveText('10 of 10');
  const wealth = page.locator('#t-sections tbody tr', { hasText: 'Wealth' });
  await expect(wealth.locator('td').nth(0)).toHaveText('1.83');
  await expect(wealth.locator('td').nth(1)).toHaveText('42%');
});

test('/admin: no PIN hash in the public site; export and delete need the PIN itself', async ({ request }) => {
  await seedDoc(request);
  const config = await (await request.get('/config.js')).text();
  expect(config).not.toMatch(/[0-9a-f]{64}/);
  const { createHash } = await import('node:crypto');
  const hash = createHash('sha256').update('1234').digest('hex');
  const reply = await (await request.post('/exec', { data: JSON.stringify({ type: 'export', session: 'WS1', pin: hash }) })).json();
  expect(reply).toEqual({ ok: false, error: 'pin' });
  const del = await (await request.post('/exec', { data: JSON.stringify({ type: 'delete', session: 'WS1', code: 'ABCDEF' }) })).json();
  expect(del.ok).toBe(false);
});

test('/admin: reset this phone clears the draft', async ({ page }) => {
  await start(page);
  await page.locator('#q-options input[value="2"]').check({ force: true });
  await page.goto('/admin');
  await page.fill('#pin', '1234');
  await page.getByRole('button', { name: 'Open' }).click();
  await page.getByRole('button', { name: 'Reset this phone' }).click();
  await page.locator('#confirm-ok').click();
  await expect(page.locator('#reset-status')).toHaveText('This phone was reset.');
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Start', exact: true })).toBeVisible();
  await expect(page.locator('#consent')).not.toBeChecked();
});

test('header: Official site link and flag language menu; Academy links on Intro and Result only', async ({ page }) => {
  await page.goto('/');
  const official = page.getByRole('link', { name: /Official site/ });
  await expect(official).toHaveAttribute('href', 'https://wcrp-academy.org/');
  await expect(official).toHaveAttribute('target', '_blank');
  await expect(page.getByRole('link', { name: /Future Leaders Programme/ })).toHaveAttribute('href', 'https://wcrp-academy.org/wcrp-future-leaders-programme/');
  await expect(page.getByRole('link', { name: /Training catalogue/ })).toHaveAttribute('href', 'https://wcrp-academy.org/catalogue/');

  // Copyright band: logo, tagline, four social links, this year's copyright
  const bottom = page.locator('.site-bottom');
  await expect(bottom).toBeVisible();
  await expect(bottom.getByRole('img', { name: 'WCRP Academy' })).toBeVisible();
  await expect(bottom).toContainText('A hub for climate science training');
  await expect(bottom.getByRole('link', { name: 'WCRP Academy on YouTube (opens in a new tab)' })).toHaveAttribute('href', 'https://www.youtube.com/@WCRPAcademy2021');
  await expect(bottom.locator('.social__link')).toHaveCount(4);
  await expect(bottom.locator('.site-bottom__copy')).toHaveText(`© ${new Date().getFullYear()} WCRP Academy. All rights reserved.`);

  // Flag menu: keyboard opens it, Escape closes it and returns focus
  const langBtn = page.getByRole('button', { name: 'Language: English' });
  await langBtn.focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#lang-menu')).toBeVisible();
  await expect(page.getByRole('button', { name: 'English', exact: true })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.locator('#lang-menu')).toBeHidden();
  await expect(langBtn).toBeFocused();

  // While answering: no Official site, no newsletter block
  await start(page);
  await expect(official).toBeHidden();
  await expect(page.locator('.site-footer')).toBeHidden();
  await expect(bottom).toBeHidden();
});

test.describe('newsletter', () => {
  test('sign-up goes to MailerLite only, never to the Sheet, and carries no wheel data', async ({ page, request }) => {
    await page.goto('/'); // the page gives this phone a pid on load
    await page.getByRole('button', { name: 'Join the newsletter' }).click();
    const form = page.getByRole('dialog', { name: 'Join the WCRP Academy newsletter' });
    await expect(form).toBeVisible();

    await form.getByRole('button', { name: 'Subscribe' }).click();
    await expect(form.getByText('Enter your first name.')).toBeVisible();

    await form.getByLabel('First name').fill('Thandi');
    await form.getByLabel('Last name').fill('Nkosi');
    await form.getByLabel('Email address').fill('thandi@example.org');
    await form.getByLabel('Country').selectOption('South Africa');
    await form.getByLabel('Researcher').check();
    await form.getByRole('checkbox', { name: /I agree to receive communications/ }).check();
    await form.getByRole('button', { name: 'Subscribe' }).click();
    await expect(form.getByText('Thank you for signing up!')).toBeVisible();

    const s = await sheet(request);
    expect(s.mailerlite).toHaveLength(1);
    const sent = s.mailerlite[0].body;
    expect(sent.email).toBe('thandi@example.org');
    expect(sent.groups).toEqual(['test-group']);
    expect(sent.fields).toMatchObject({ name: 'Thandi', last_name: 'Nkosi', country: 'South Africa', are_you_aan: 'Researcher' });
    expect(sent.fields.i_agree_to_receive_communications_from_the_wcrp_academy_and_accept_the_data_privacy_statement).toBe('on');
    const pid = await page.evaluate(() => JSON.parse(localStorage.getItem('wcrp-wheel-v1')).pid);
    expect(JSON.stringify(sent)).not.toContain(pid);
    expect(JSON.stringify(sent)).not.toMatch(/WS1|session|pid/);
    expect(s.responses).toHaveLength(0);
    expect(JSON.stringify(s.joins)).not.toMatch(/thandi/i);
    expect(await page.evaluate(() => JSON.stringify(localStorage))).not.toMatch(/thandi|nkosi/i);

    // The footer now thanks this phone instead of offering the form again
    await form.getByRole('button', { name: 'Close' }).first().click();
    await expect(page.getByText('You’re signed up. Thank you!')).toBeVisible();
  });
});
