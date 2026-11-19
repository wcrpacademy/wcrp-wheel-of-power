# Apps Script API

The pages talk to one Apps Script web app (`endpoint` in `config.js`): `apps-script/Code.gs` plus `apps-script/scoring.gs` (generated from `js/scoring.js`). Install steps are at the top of `Code.gs`. Locally, `tests/serve.mjs` runs these same `.gs` files on a fake in-memory Sheet (`tests/gas-sandbox.mjs`), and `tests/apps-script.test.mjs` tests them directly.

All POSTs send JSON as `text/plain` (no CORS preflight). Every reply is JSON with `ok: true | false` (and an `error` code when false). Bodies over 4,000 characters are refused.

## Sheet "Wheel Database"

`setup()` (run once from the editor) makes both tabs. Session and pid columns are plain text.

- **Responses:** `timestamp, session, pid, lang, consent, skin, education, ability, sexuality, neuro, mental, body, housing, wealth, language, gender, citizenship, n, points, pct, band`. Answers are `1 | 1.5 | 2 | 2.5 | 3 | NA`; `pct` is rounded to 2 decimals (empty when n is 0); `band` is the label (`90% and above`, `70–90%`, `70% and below`, `not banded`).
- **Joins:** `timestamp, session, pid`.

`session` must match `^[A-Za-z0-9][A-Za-z0-9_-]{0,39}$` and `pid` `^[A-Za-z0-9][A-Za-z0-9-]{7,63}$`, so no cell can start like a formula.

## POST `{ type: "join", session, pid }`

Appends `timestamp, session, pid` to **Joins** once per pid per session (repeats are ignored). Sent when the participant ticks consent and starts.

## POST `{ type: "submit", session, pid, lang, consent: true, answers, n, points, pct, band }`

- `answers`: `{ skin: 3, education: 2.5, …, citizenship: "NA" }`: every section key, each `1 | 1.5 | 2 | 2.5 | 3 | "NA"`.
- Validates `session`, `pid`, `consent === true` and every answer; anything else gives `{ ok: false }`. An unknown `lang` is stored as `en`.
- **Recomputes** `n, points, pct, band` with `scoring.gs` and stores the server values (the client's are ignored).
- One row per pid per session: a resubmission replaces that pid's row. Also adds the Joins row if it is missing.
- Reply: `{ ok: true, n, points, pct, band }`.

## GET `?type=summary&session=…`

Aggregates only, never a pid or a row:

```json
{
  "ok": true, "session": "WS1",
  "joined": 10, "submitted": 10,
  "banded": 9, "notBanded": 1,
  "bands": { "high": 1, "mid": 1, "low": 7 },
  "groupPct": 58.86,
  "pcts": [6.25, 47.92, 54.17, 60, 60.42, 61.36, 62.5, 81.25, 95.83],
  "coverage": { "answered": 108, "possible": 120 },
  "answeredAll": 7,
  "minGroup": 5,
  "sections": { "ability": { "n": 10, "na": 0, "mean": 2.7 }, "…": {} }
}
```

- `pcts`: the banded people's %, sorted low to high, rounded to 2 decimals (the dots on the band strip).
- `sections` is `null` until `submitted >= 5`.
- Cached for 5 seconds per session; every join, submit and delete clears that session's cache.
- **ASSUMPTION (Ken to confirm):** a section's `mean` is also `null` while fewer than 5 people answered that section, so a section answered by 1–4 people never shows on /live or in Deep analytics.

## POST `{ type: "newsletter", first_name, last_name, email, country, language, affiliation, roles[], topics[], consent: true, website }`

The newsletter sign-up (same as the values card sort). Forwarded to MailerLite (Script properties `MAILERLITE_API_TOKEN`, optional `MAILERLITE_GROUP_ID`); **never written to the Sheet or logged**, and it carries no pid or session. `website` is a spam trap: if filled, the reply is `{ ok: true }` and nothing is sent. Errors: `bad_email`, `missing_name`, `no_consent`, `not_configured`, `provider_error`.

## POST `{ type: "pin", pin }`

Checks the organiser PIN: `{ ok: true }`, or `error` `pin` (wrong), `locked` (10 wrong PINs: every PIN call is refused for 10 minutes after the last wrong one) or `no_pin_set` (no `ADMIN_PIN_HASH` Script property). Export and delete run the same check first.

## POST `{ type: "export", session, pin }`

Returns `{ ok: true, csv }`: header `session,lang,<12 section keys>,n,points,pct,band`, one row per person, **no pid and no timestamp**, rows sorted by their answers (not by time). Band is the label (`90% and above`, `70–90%`, `70% and below`, `not banded`).

## POST `{ type: "delete", session, code, pin }`

Deletes the Responses and Joins rows whose pid ends with the 6-character withdrawal `code` (the last 6 hex characters of the pid, case-insensitive). Reply `{ ok: true, deleted: <number of rows> }`.

## Organiser PIN (changed from EXECUTION_PLAN.md §4–5)

The plan put the PIN's hash in `config.js`. That file is public, and a short PIN is found from its SHA-256 hash in well under a second by trying every value, so the hash would give away the PIN. Instead:

- `config.js` holds no PIN and no hash.
- `/admin` sends the **PIN itself** over HTTPS (`type: "pin"`), and the Apps Script compares `sha256(pin)` with the **Script property `ADMIN_PIN_HASH`** (from `npm run pin`), which never goes in the repo.
- After 10 wrong PINs, PIN calls are refused for 10 minutes. Use 6 or more characters.
- Export is a POST, so the PIN is never in a URL or the browser history.
