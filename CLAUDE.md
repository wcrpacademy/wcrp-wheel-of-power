# wheel-power (Wheel of Power / Privilege workshop app)

A one-time workshop web app. Participants place themselves on a 12-section Wheel of Power/Privilege on their phones, see their own wheel and score, and a projector shows anonymous group results. Results will be reported outside the workshop, so consent and anonymity are requirements.

## Read first

1. `EXECUTION_PLAN.md`: decisions, scoring, screens, phases. Source of truth for scoring and graphs: the Claude Doc "Wheel of Power — Scoring Plan" (Ken has the link). If they disagree, ask Ken.
2. `docs/API.md`: the Apps Script contract and Sheet columns. `apps-script/Code.gs` implements it; `tests/serve.mjs` runs that real `.gs` on a fake Sheet (`tests/gas-sandbox.mjs`).

## Rules

- Static HTML/CSS/vanilla JS (ES modules). No framework, no bundler, no CDN, no external requests at runtime (fonts are self-hosted).
- Everything that may change on the day lives in `config.js`.
- Section order and keys are fixed (`js/scoring.js` `SECTION_KEYS`); ring wording lives in `data/sections.json`, not in code.
- `js/scoring.js` is pure and shared with Apps Script: after changing it, run `npm run gs` (a test fails if `apps-script/scoring.gs` differs).
- Collect no names, emails, IPs or free text. The projector never shows a pid, a name, an individual row or a ranking of people.
- One exception (Ken, 19 Nov 2026): the newsletter sign-up (`js/newsletter.js`, same form as the values card sort) passes name and email straight to MailerLite through the Apps Script. It is never written to the Sheet or the phone, and never sent with a pid, session or answers.
- The wheel is our own SVG drawing (`js/wheel.js`). Never copy or trace Sylvia Duckworth's image, fonts or lettering; keep the credit line on the intro and result screens.
- WCAG 2.2 AA. Brand tokens in `css/tokens.css`. Never green, cyan or yellow text on light backgrounds.
- Mark guesses with `// ASSUMPTION` for Ken to confirm.
- Node 24 (`.nvmrc`), tooling only.

## Commands

- `npm run preview`: local site + the real Apps Script on a fake Sheet, on http://127.0.0.1:4173 (`/live`, `/admin`, PIN 1234). Add the doc's 10 example people: `node tests/serve.mjs 4173 --seed`.
- `npm test`: scoring and Apps Script unit tests, then Playwright (flow, views, axe).
- `npm run lint`, `npm run gs`, `npm run pin`, `npm run qr` (after changing `publicUrl`).

## Hosting

- Live at https://wheelpower.wcrp-academy.org (Infomaniak static, behind Cloudflare). GitHub repo `wcrpacademy/wcrp-wheel-of-power` (renamed from `wheel-power`). A push to `main` runs the tests and deploys. Details: README "Live site".
- The server's `.htaccess` and the Cloudflare cache rule are managed by hand, outside the repo.

## Git

- Default branch `main`; work on `feat/*` branches. Commit or push only when Ken asks.

## Secrets

- None in this repo. The Apps Script URL is not secret. The organiser PIN and its hash never go in the repo or `config.js` (public, and a short PIN's hash gives the PIN away): the hash lives only in the Apps Script's Script property `ADMIN_PIN_HASH` (`npm run pin`).
- SFTP credentials live in GitHub repository secrets (names only in `deploy.yml`).
