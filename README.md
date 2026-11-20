# Wheel of Power / Privilege (WCRP Academy workshop)

Participants place themselves on a 12-section Wheel of Power/Privilege on their phones, see **Your wheel** with a "closeness to power" score and band, and can open **Deep analytics** (their ring per section beside the group average). The projector (`/live`) shows only anonymous group results: a band strip and per-section averages. Organisers use `/admin`.

Wheel concept: Sylvia Duckworth's *Wheel of Power/Privilege* (adapted from ccrweb.ca), redrawn here in our own design.

## Try it locally

```sh
npm ci
node tests/serve.mjs 4173 --seed   # site + the real Apps Script on a fake Sheet, with the scoring doc's 10 example people
```

- Participant: http://127.0.0.1:4173/
- Projector: http://127.0.0.1:4173/live
- Organiser: http://127.0.0.1:4173/admin (PIN `1234` on the local server only)

## Live site

- Participants: https://wheelpower.wcrp-academy.org/ · projector: `/live` · organiser: `/admin`
- **Deploy:** every push to `main` runs lint and tests, then uploads over SFTP to Infomaniak (`.github/workflows/deploy.yml`, secrets in the GitHub repo). Only the files the pages load are uploaded, never dotfiles.
- **Server `.htaccess`** (edited by hand in FileZilla, never deployed): `/live` and `/admin` without `.html`, `Cache-Control: no-cache`, and `X-Robots-Tag: noindex, nofollow, noarchive`. The pages also carry `<meta name="robots" content="noindex, nofollow">`.
- **Cloudflare:** Cache Rule "Hostname equals wheelpower.wcrp-academy.org → Bypass cache", so a `config.js` change reaches phones straight away.
- **Apps Script:** bound to the Wheel Google Sheet (install steps at the top of `apps-script/Code.gs`). Script properties: `ADMIN_PIN_HASH` (`npm run pin`, 6+ characters), `MAILERLITE_API_TOKEN`, `MAILERLITE_GROUP_ID`. After a code change: Deploy → Manage deployments → Edit → New version (keeps the `/exec` URL).

## Tests

```sh
npm test        # scoring + Apps Script unit tests (doc test vectors) + Playwright end to end + axe
npm run lint
```

## Files

| Path | What |
|---|---|
| `config.js` | Day-of settings (session, endpoint, languages, newsletter). Never the PIN or its hash |
| `data/sections.json` | Section labels and ring wording (EN + FR) |
| `js/scoring.js` | Pure scoring, shared with Apps Script (`apps-script/scoring.gs`, `npm run gs`) |
| `js/wheel.js` | The wheel SVG (rotation, half steps, N/A) |
| `js/app.js` | Participant flow |
| `js/dotplot.js`, `js/charts.js` | Deep analytics dot plot; band strip and section bars |
| `js/live.js`, `js/admin.js` | Projector and organiser pages |
| `js/newsletter.js`, `js/countries.js`, `css/site.css` | Newsletter sign-up (MailerLite via the Apps Script), Official site button, flag language menu, Academy link cards |
| `apps-script/Code.gs` | The Apps Script web app (install steps at the top), `appsscript.json` its manifest |
| `docs/API.md` | Apps Script contract and Sheet columns |
| `qr/join.svg`, `qr/join.png` | Join QR for `/live` and for slides/print, made from `config.js` `publicUrl` by `npm run qr` (a test fails if it's out of date) |
| `tests/serve.mjs`, `tests/gas-sandbox.mjs` | Local server running the real `.gs` on a fake Sheet |
