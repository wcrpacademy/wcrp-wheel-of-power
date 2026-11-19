// Playwright: runs against tests/serve.mjs (the site + a mock of the Apps Script web app).
// Locally it uses the installed Google Chrome (no browser download); in CI the workflow installs Chromium.
import { defineConfig } from '@playwright/test';

const PORT = 4174; // not 4173, so a running `npm run preview` doesn't share the mock Sheet with the tests
const phone = { viewport: { width: 360, height: 640 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 };

export default defineConfig({
  testDir: 'tests',
  testMatch: /.*\.spec\.mjs$/,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  workers: 1, // one mock Sheet shared by all tests
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: 'list',
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    browserName: 'chromium',
    channel: process.env.CI ? undefined : 'chrome',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: `node tests/serve.mjs ${PORT}`,
    url: `http://127.0.0.1:${PORT}/index.html`,
    reuseExistingServer: !process.env.CI,
  },
  projects: [
    { name: 'phone-360', use: phone },
    { name: 'desktop-1440', use: { viewport: { width: 1440, height: 900 } }, testMatch: /flow\.spec\.mjs$/ },
  ],
});
