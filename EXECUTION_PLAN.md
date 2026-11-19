# Wheel of Power — execution plan for Claude Code

This is the build plan for a one-time workshop web app. Participants answer a 12-section Wheel of Power/Privilege on their phones. They see their own result, and a projector shows anonymous group results. Results will be reported outside the workshop.

Source of truth for scoring and graphs: the Claude Doc "Wheel of Power — Scoring Plan" (Ken has the link). If this file and the doc disagree, ask Ken.

Read this whole file before writing code. Then reply with your review: risks, anything unclear, and the order you'll work in. Wait for Ken's go-ahead before Phase 1.

---

## 0. Decisions already made (do not reopen)

| Area | Decision |
|---|---|
| Scale | Rescaled (POMP). Ring 1 = 0%, ring 3 = 100%. N/A sections leave the total. |
| Answers | Ring values 1, 1.5, 2, 2.5, 3, or N/A. Half steps allowed. |
| Per-person summary | One % per person, then a band: **90% and above**, **70–90%**, **70% and below**. No % and no band if fewer than 9 of 12 sections apply; that person's answers still count per section. |
| Group summary (projector) | Band strip: one anonymous dot per person on a 0–100% line, the 70% and 90% zones shaded, a count in each band. Rescaled only. |
| Individual result (phone) | Option A, **Your wheel**: the 12-slice wheel with the chosen ring highlighted in each slice, plus score and band. A **"Deep analytics"** button opens option C, the **section dot plot**: the person's ring per section beside the group average. |
| Reporting | Results will be reported outside the workshop, so consent and anonymity are requirements, not extras. |
| Artwork | The wheel is **our own SVG drawing**. The reference is Sylvia Duckworth's *Wheel of Power/Privilege* (adapted from ccrweb.ca). Do not copy or trace her image, fonts or hand-lettering. Show the credit line on the intro screen and the result screen. |

## 1. Assumptions (Ken to confirm; marked in code with `// ASSUMPTION`)

- **Stack:** the same as the values card sort repo (`wcrp-values-card-sort`): static HTML/CSS/vanilla JS, no framework, no CDN, no external requests. All day-of settings live in `config.js`. Node 24 is used only for tooling and tests.
- **Repo and host:** `wcrp-wheel-of-power` in the `wcrpacademy` GitHub org; `wheelpower.wcrp-academy.org` on Infomaniak static hosting behind Cloudflare. GitHub Actions deploys over SFTP, reusing the values tool's workflow and secrets pattern.
- **Data:** a new Google Sheet "Wheel Database" plus an Apps Script web app, the same pattern as the values tool. Time zone `Africa/Johannesburg`.
- **Languages:** English first. French is optional and uses the values tool's i18n pattern; results are always stored with language-neutral keys.
- **Minimum group size** before any group average is shown (Deep analytics, projector per-section view): 5.

## 2. Sections and data

Fixed order, clockwise as on the reference wheel, used everywhere (wheel, storage, graphs, CSV):

| # | key | Label |
|---|---|---|
| 1 | `skin` | Skin colour |
| 2 | `education` | Formal education |
| 3 | `ability` | Ability |
| 4 | `sexuality` | Sexuality |
| 5 | `neuro` | Neurodiversity |
| 6 | `mental` | Mental health |
| 7 | `body` | Body size |
| 8 | `housing` | Housing |
| 9 | `wealth` | Wealth |
| 10 | `language` | Language |
| 11 | `gender` | Gender |
| 12 | `citizenship` | Citizenship |

Ring labels per section (outer ring 1 → centre ring 3) come from the reference wheel's categories. Put them in `data/sections.json`, not in code. Ken should check the wording.

### Sheet tabs

- **Responses:** one row per submission.
  - `timestamp`, `session` (workshop code from config), `pid` (random, per device, no personal data), `lang`, `consent` (TRUE).
  - Then one column per section key holding `1 | 1.5 | 2 | 2.5 | 3 | NA`.
  - Then `n`, `points`, `pct`, `band` (computed client-side, then **recomputed in Apps Script** and stored from the server value).
- **Joins:** `timestamp`, `session`, `pid`, for the live joined counter.
- No names, emails, IPs or free text anywhere.

## 3. Scoring (pure module, `js/scoring.js`, no DOM)

```
n      = number of sections that are not NA
points = sum of ring values of those sections
pct    = (points - n) / (2 * n) * 100          // rescaled (POMP)
band   = n < 9      → null ("Not banded")
         pct >= 90  → "90% and above"
         pct > 70   → "70–90%"
         else       → "70% and below"
```

- Round only for display (1 decimal). Store unrounded `pct`.
- Section group average = mean ring of people who answered that section (NA excluded), shown with `n = answered of total`.
- Group % = mean `pct` of banded people only.
- The same module runs in the browser and in Apps Script. Keep it dependency-free so it can be pasted into `apps-script/scoring.gs`, and add a test that both copies match.

### Test vectors (must pass exactly)

| pid | ring values in section order (NA = not applicable) | n | points | pct | band |
|---|---|---|---|---|---|
| P1 | 3, 3, 3, 3, 2, 2, 2, 3, 2.5, 3, 2, 3 | 12 | 31.5 | 81.25 | 70–90% |
| P2 | 1, 3, 3, 3, 2, 1.5, 2.5, 2.5, 2, 1.5, 2, 3 | 12 | 27 | 62.50 | 70% and below |
| P3 | NA, 2.5, 2.5, 3, 2, 1, 2, 2, 1.5, 2, 3, 3 | 11 | 24.5 | 61.36 | 70% and below |
| P4 | 2, 2, 3, 3, 3, 2, 2, 1.5, 1, 1, 2, 1 | 12 | 23.5 | 47.92 | 70% and below |
| P5 | 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 2, 3 | 12 | 35 | 95.83 | 90% and above |
| P6 | 1, 1, 2, 1, 1, 1, 1.5, 1, 1, 1, 1, 1 | 12 | 13.5 | 6.25 | 70% and below |
| P7 | 2, 3, 3, NA, 2, 2, 1, 2, 2, 2, 3, NA | 10 | 22 | 60.00 | 70% and below |
| P8 | NA, NA, 3, NA, 3, NA, NA, NA, NA, NA, 2, NA | 3 | 8 | 83.33 | not banded |
| P9 | 2.5, 3, 1.5, 2, 1, 2.5, 2, 2.5, 2, 2.5, 2, 3 | 12 | 26.5 | 60.42 | 70% and below |
| P10 | 2, 2.5, 3, 1, 2, 2, 2.5, 2, 1.5, 1.5, 2, 3 | 12 | 25 | 54.17 | 70% and below |
| All 1s | 1 ×12 | 12 | 12 | 0.00 | 70% and below |
| All 2s | 2 ×12 | 12 | 24 | 50.00 | 70% and below |
| All 3s, Skin NA | NA, then 3 ×11 | 11 | 33 | 100.00 | 90% and above |

With P1–P10 as fixtures, also assert:

- Group % over the 9 banded people is **58.9%**.
- Band counts are **1 / 1 / 7**, with **1 not banded**.
- Coverage is **108 of 120**.

Also assert the per-section averages in the doc. For example, Ability is mean 2.7 (85%, n = 10) and Wealth is mean 1.83 (42%, n = 9).

## 4. Screens (phone-first, 360px wide upwards)

1. **Intro and consent.**
   - What the activity is, that it is anonymous, that **results will be reported** (aggregated only), how long it takes, and that any section can be marked "Not applicable to me".
   - A required consent checkbox, and a credit line for the wheel.
   - No consent, no answers.
2. **Wheel question (×12).**
   - The full wheel is drawn as SVG. The current section's slice is highlighted and the wheel **rotates** so that slice sits at the top.
   - The participant taps a ring, or one of 5 positions (1, 1.5, 2, 2.5, 3), shown as the three rings plus the two boundaries between them.
   - A "Not applicable to me" button sits below the wheel.
   - Back and Next buttons, and a progress indicator ("4 of 12").
   - Rotation uses CSS transform. With `prefers-reduced-motion` it jumps without animating.
3. **Review.** A list of the 12 answers, each one editable, then Submit.
4. **Result: Your wheel (option A).**
   - The wheel with the chosen ring filled in each slice; half steps sit across two rings. N/A slices are grey and labelled.
   - "Closeness to power: 63.6%", the band, and "11 of 12 sections answered".
   - Legend: "Closer to centre = closer to power".
   - If fewer than 9 sections apply: no % and no band, with the line "Answer at least 9 sections to see an overall score."
5. **Deep analytics (option C), opened from a button on the result screen.**
   - One row per section with zones for the outer, middle and centre ring. A blue dot shows the person's answer; a grey tick shows the group average, fetched from Apps Script.
   - N/A rows show "not applicable".
   - If the session has fewer than 5 submissions, the dots appear but group ticks are hidden, with a note: "Group averages appear once 5 people have taken part."
6. **Projector `/live`.**
   - A joined counter at the top, then the band strip with counts.
   - A toggle shows the supporting per-section bars (group average per section, with n).
   - Polls every 5 seconds. Never shows a pid, a name or an individual row.
7. **Organiser `/admin` (PIN, hash in `config.js`).**
   - Set the session code, reset this phone, open the Sheet.
   - Download an anonymised CSV of the session (section values, n, pct, band; no pid).
   - A "Report" view showing the doc's headline numbers for the session.

The visuals should match the charts in the doc: the band strip, Your wheel and the dot plot. Use WCRP Academy colours from the site's tokens (navy `#232C3D`, blue `#0069A9`, green `#85E885`, paper `#F1F1F1`), Plus Jakarta Sans with Arial as the fallback, and WCAG 2.2 AA throughout. The ring buttons must work by keyboard and have accessible names, for example "Wealth: middle ring".

## 5. Apps Script

- `doPost`:
  - Validates the session and every section value against the allowed set.
  - Recomputes n, points, pct and band with `scoring.gs`, then appends to Responses.
  - Allows one submission per `pid` per session; a resubmission replaces that pid's row.
- `doPost?type=join`: appends to Joins.
- `doGet?type=summary&session=…`:
  - Returns **aggregates only**: joined count, submitted count, band counts, the list of banded pcts (for the dots, no pids), and per-section mean and n.
  - Per-section means are only returned once submitted ≥ 5.
- `doGet?type=export` needs the organiser PIN hash and returns the anonymised CSV.
- Deployed as Ken, access "Anyone". Put a note in `docs/DAY-OF-SETUP.md` to restrict Sheet sharing to the team.

## 6. Phases and done-when

| Phase | Work | Done when |
|---|---|---|
| 0 | Repo from the values-tool conventions: `CLAUDE.md`, `.nvmrc` (24), `config.js`, Playwright, ESLint, GitHub Actions deploy | CI green on an empty page, deploy to `wheelpower.wcrp-academy.org` works |
| 1 | `scoring.js` + unit tests (section 3) | Every test vector passes; Apps Script copy matches |
| 2 | Wheel SVG component: 12 slices × 3 rings + hub, labels, highlight, rotation, half-step positions, N/A state | Renders at 360–1440px; rotation and reduced motion work; keyboard works |
| 3 | Flow: intro and consent → 12 questions → review → submit, with local draft saved (try/catch around storage) | Full run on a phone in a private tab; refresh mid-way keeps answers |
| 4 | Apps Script: submit, join, summary, export | Rows land in the Sheet; summary JSON matches the doc's 10-person example when seeded with P1–P10 |
| 5 | Result screen A + Deep analytics C | Matches the doc's worked example for the 63.6% participant; group ticks hidden under 5 submissions |
| 6 | Projector `/live`: counter, band strip, per-section toggle | Seeded P1–P10 shows 1 / 1 / 7, 1 not banded, group 58.9% |
| 7 | `/admin`: PIN, session, reset phone, CSV export, report view | CSV has no pid; report numbers match `/live` |
| 8 | Accessibility, French (optional), copy check, `docs/DAY-OF-SETUP.md`, retire plan | axe has no serious issues; Playwright end-to-end passes; Ken signs off the wording |

## 7. Privacy and ethics (blocking for reporting)

- The ethics review must be cleared before the workshop. Ken will confirm; the consent text comes from that review.
- No personal data. `pid` is random, and the CSV export drops it.
- The projector never shows individuals, a ranking or a sorted list of people.
- Group averages appear only with 5 or more submissions.
- Withdrawal: the result screen shows a short code (the last 6 characters of the pid) that a participant can give the organiser to have their row deleted. Admin gets a "Delete by code" action.
- After the workshop: export, archive, delete the Sheet rows by the agreed retention date, and turn off the Apps Script deployment. Write this into `docs/DAY-OF-SETUP.md`.

## 8. Out of scope

Accounts, names, emails, free-text answers, comparison between people, the raw (÷ 36) scale, and the plain spider graph.

## 9. First reply to Ken

Before coding, send:

1. Your review of this plan: risks, gaps, and anything to change.
2. Confirmation or questions on the assumptions in section 1.
3. The ring-label wording you'll put in `data/sections.json`, for Ken to check.
4. Your phase order. Stop after each phase for Ken's check.
