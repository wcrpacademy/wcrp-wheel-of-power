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

## Tests

```sh
npm test        # scoring + Apps Script unit tests (doc test vectors) + Playwright end to end + axe
npm run lint
```

## Files

| Path | What |
|---|---|
| `config.js` | Day-of settings (session, endpoint, languages, PIN hash) |
| `data/sections.json` | Section labels and ring wording (EN + FR) |
| `js/scoring.js` | Pure scoring, shared with Apps Script (`apps-script/scoring.gs`, `npm run gs`) |
| `js/wheel.js` | The wheel SVG (rotation, half steps, N/A) |
| `js/app.js` | Participant flow |
| `js/dotplot.js`, `js/charts.js` | Deep analytics dot plot; band strip and section bars |
| `js/live.js`, `js/admin.js` | Projector and organiser pages |
| `js/newsletter.js`, `js/countries.js`, `css/site.css` | Newsletter sign-up (MailerLite via the Apps Script), Official site button, flag language menu, Academy link cards |
| `apps-script/Code.gs` | The Apps Script web app (install steps at the top), `appsscript.json` its manifest |
| `docs/API.md` | Apps Script contract and Sheet columns |
| `tests/serve.mjs`, `tests/gas-sandbox.mjs` | Local server running the real `.gs` on a fake Sheet |
