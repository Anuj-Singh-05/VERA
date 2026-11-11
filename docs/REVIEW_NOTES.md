# VERA redesign: review notes (overnight, 11 Nov 2026)

Branch `redesign/review3`. Nothing is merged or pushed. `main` is untouched (still `deed17d`).

## Before you demo: port 8080 is busy
A mock VERA server that I started during testing is still running on **port 8080** (process id 11952,
java.exe, temporary history folder, mock agent only). My tool permissions refused to stop it, and your rule 3
says not to kill processes I did not start, so I ran later tests on ports 8091–8094 instead. Stop it before the demo:

    Stop-Process -Id 11952

(or close it from Task Manager). It never wrote to `vera-data/`.

## What was built, by stage
| Stage | Commit | What |
|---|---|---|
| Baseline | `7c9a1ac` | Your working tree as it was (includes the uncommitted dashboard edit, the brief and the backup). |
| (b) | `a2ac678` | New `/dashboard.html`: shell, verdict, key figures, drift, run / empty / loading / unreachable states. `/legacy.html` copy. |
| (c) | `1210c6b` | Case lattice, figure visuals, Batches, Findings with filters, evidence drawer with deep links. |
| Consistency fix | `a2cf0ed` | One definition of "needs a person's decision" (BLOCKED and NEEDS_HUMAN_REVIEW both wait, per CertificationService and the README); verdict, figure, chips and buttons all read `pendingHumanReview`; a runtime check shows a visible warning if the report contradicts itself; Node rule tests. |
| Research and direction | `8e64bf9` | DESIGN_RESEARCH.md (27 sites), DESIGN_DIRECTION.md (three directions, Cobalt Ledger chosen), new tokens, Archivo + JetBrains Mono. |
| (d) | `b578d1d` | Dashboard rebuilt in the new look; review dialog; Runs and Reviews; fixtures; print stylesheet. |
| (f) | `e9c8c28` | `/landing.html`, executive product page. |
| (e) landing | `b6ac5f1` | Four screenshot iterations on the landing page. |
| (e) dashboard | `195aa44` | Print to one page, keyboard focus return, accessible tab names, phone layout. |
| Docs | (final commit) | DESIGN_GAP_ANALYSIS.md, DESIGN.md, README routes and commands, this file. |

## The inconsistency you found (section 2)
- **Cause:** the headline counted only NEEDS_HUMAN_REVIEW as "waiting for a human decision", while the figure and buttons used the server's `pendingHumanReview`, which also includes BLOCKED. The README says: "NEEDS_HUMAN_REVIEW and BLOCKED wait for a human approve/reject".
- **Fix:** everything now uses `verdict.js`. With the default mock run the sentence reads: "Two of five batches certified. Three need a person's decision: one blocked, two in review." That matches the figure (3) and the buttons (B2, B3, B4).
- **The check:** `node --test src/test/js/verdict.test.mjs` runs 8 tests. They cover a mismatch between statuses and the pending list, approving and rejecting, nothing certified, and incomplete batches. In the page, a mismatch shows a red notice ("The report contradicts itself"), and Approve/Reject follow the server's list.

## Research summary
- **27 sites reviewed** in the built-in browser, read-only. I recorded each site's fonts, colours, gradients, canvas/video/SVG use, animation libraries and sticky elements from the live DOM, plus screenshots of the strongest candidates.
- **Skipped:**
  - lemonade.com and hippo.com: Cloudflare bot-check pages (HTTP 403).
  - The Awwwards "Secured Finance" site: navigation refused.
  - Land-book's fintech filter: did not apply.
  - Dribbble, Behance, Godly, Mobbin, Lapa Ninja and Saaspo: not reached in the time available.
- **Shortlist:** Coalition, DeepBook, At-Bay, Arize Phoenix, Beady AI, Stripe.
- **Directions considered:** data-noir, editorial colour blocks, and Cobalt Ledger.
- **Chosen: Cobalt Ledger.**
  - A drenched cobalt (#2340FF) with navy-black ink and giant expanded Archivo type.
  - The field is either safe white SaaS (Credo AI, Vanta, Palantir) or black with a thin blue (DeepBook, Linear, Sardine); a drenched saturated blue sits in neither.
  - Blue is insurance's trust colour, so this keeps trust while gaining identity.
  - The working dashboard stays light for projectors.
  - The brand colour never borrows a status meaning.

## Screenshots
Folder: `C:\Users\anujk\AppData\Local\Temp\claude\87aeddecca64ca78\2ee4a141-34b8-438f-9db0-c212e10537d8\scratchpad\final-screens\` (outside the repo).
- **`before\`:** the old dashboard: `report-1920x1080`, `report-1440x900`, `report-1280x720`, `report-390x844`, `report-full-1440`, `empty-1920x1080`, `empty-1280x720`, `empty-390x844`.
- **Dashboard after:** `d-overview-{1920,1280,390}`, `d-overview-dark-{1920,1280}`, `d-batches-*`, `d-findings-*`, `d-runs-*`, `d-rundetail-1920`, `d-reviews-*`, `d-drawer-*`, `d-dialog-1920`, `d-empty-*`.
- **Test-data states, light and dark:** `fx-{incomplete,nodata,apierror,long,many,zero}-overview[-dark]-1920`, `fx-*-batches-1920`, `fx-long-drawer-{1920,390}`.
- **Landing after:** `final-landing-hero-{1920,1280,390}`, `final-landing-full-{1920,1280,390}`, `final-landing-how-1920`, `final-landing-results-1920`, `final-landing-reduced-1920`, `final-landing-nojs-1920`.
- **`iterations\`:** every landing section at 1920 and 390 (`e3-L-*`), and every dashboard view in light and dark at three widths (`e4-D-*`).
- **`overview-print.pdf`:** one-page print summary.
- **Logs:** `regression-*.json` hold the browser test results.

## Libraries and assets added
| Asset | Licence | Where |
|---|---|---|
| Archivo (variable, latin subset, woff2) | SIL OFL 1.1 | `assets/fonts/archivo-var-latin.woff2`, `OFL-Archivo.txt` |
| JetBrains Mono (latin subset, woff2) | SIL OFL 1.1 | `assets/fonts/jetbrains-mono-latin.woff2`, `OFL-JetBrainsMono.txt` |

- Both fonts were downloaded once from Google Fonts; the licence texts come from the google/fonts repository.
- **No JavaScript libraries:** no GSAP, Lenis or Three.js. All motion is vanilla CSS/JS.
- **No images or photos.** All visuals are inline SVG, CSS or canvas drawn by the page.
- The grain texture is an inline SVG data URI.
- Geist, Geist Mono and Instrument Serif were removed with their licence files when the direction changed.

## Data honesty
- **Lattice:** a cell shows a case ID only when the report names the case. Passed claims are known only as a count (casesTested minus distinct failed cases). Anything not accounted for shows as "Unknown".
- **Landing results:** these come from `assets/data/recorded-results.json`, copied read-only from `vera-data` runs #1–#3. Each matched FACTS, which I checked against the file.
- **C4-02 example:** "documents support 65,000, a hidden note asked for 3,00,000, the baseline agent recommended 3,00,000". The documents part is in the dataset. **The 3,00,000 recommendation is taken from your D5 message.** Run history stores batch summaries only, so I could not verify it from the repo.
- **Mock figures on the landing page** (C2-01 at 5,94,000 and the −31.2 point drift) are labelled "Simulated agent".
- **Test-data files** (`assets/data/fixtures`) were built from real mock-agent output. The incomplete, no data and API-error states were derived by replacing scored results with model-call errors, then recomputing each batch exactly as CertificationService does. They only load with `?fixture=`, always show a "Fixture data" banner, and disable Run and Review.

## Not verified, or uncertain
- **Live LLM runs:** not run, by rule. The 4–5 minute running state was checked only as far as the indeterminate bar, the timer and the disabled controls. Mock runs finish in under a second, so the "running" screenshot is not representative.
- **Real projector:** not tested. Contrast was checked numerically (WCAG ratios in DESIGN_DIRECTION.md).
- **Screen reader:** no full screen-reader pass. I checked the tab order, focus rings, aria labels, dialog and drawer focus, and Esc/arrow keys with a scripted keyboard walk.
- **Print:** verified with Chrome's print-to-PDF (exactly one A4 landscape page). I could not render the PDF to an image to look at it (no poppler); the layout was checked with print-media emulation screenshots instead.
- **Design-tool findings left standing:**
  - Rule-code marquee: you requested it; it pauses on hover, has a pause button and stops under reduced motion.
  - Hatched stripes: they mean critical / not tested.
  - Ledger grid: part of the chosen direction.
  - "Low contrast" readings: they come from the print stylesheet and from SVG text, not the screen.
  - Recorded suppressions in `.impeccable/config.json`: only the three originally approved font names (now unused).
- **Fixtures recomputation:** batch 4's split of injection and PII cases is approximated in the generator, but no fixture modifies batch 4.

## Rules I had to bend, and why
1. **Branch name:** git cannot create `redesign` while `redesign/review3` exists. You approved staying on `redesign/review3`.
2. **Port 8080:** a leftover test server of mine holds 8080 and the tool refused to stop it. I followed rule 3 (other ports) instead. See the top of this file.
3. **Run #7 in vera-data:** added at 01:34 on 11 Nov by a server that used the default history folder. I believe it came from my checkpoint (b) instruction to run plain `mvn spring-boot:run`. I have not touched the file since.
4. **"When JS fails":**
   - The landing page is complete without JS; it was checked with script execution disabled.
   - The dashboard needs JS by nature (it is a live API client), so without JS it shows only the shell and the footer.

## Commands
Start the app safely (PowerShell, project root; your real history is not touched):

    $env:VERA_HISTORY_DIR="$env:TEMP\vera-demo"; mvn spring-boot:run

Then open http://localhost:8080/landing.html (product page) or http://localhost:8080/dashboard.html.
For the drift demo:
1. Run once with `$env:VERA_MOCK_FAILURES_PER_BATCH="0,0,0,0,0"`.
2. Stop the server.
3. Clear the variable with `Remove-Item Env:VERA_MOCK_FAILURES_PER_BATCH`.
4. Start the server again and run.

Promote the landing page to `/` (keeps the old page as `index-previous.html`):

    git mv src/main/resources/static/index.html src/main/resources/static/index-previous.html; git mv src/main/resources/static/landing.html src/main/resources/static/index.html

Tests:

    mvn clean test
    node --test src/test/js/verdict.test.mjs

## Demo: what to click
1. Overview: read the sentence, point at the case lattice.
2. Run assurance suite.
3. Click a dark red square to open the evidence drawer, then Next to walk the findings.
4. Batches: Approve or Reject a waiting batch, type your name, and watch the chip change.
5. Reviews: the logged decision.
6. Runs: the chart and the drift alerts.

The same steps are in the dashboard footer under "Presenting live: what to click".

## Three things I would do next with another hour
1. **Pass the real claim documents to the drawer.** A small read-only `/api/cases` endpoint, which you declined for now, would let the drawer show each document's amount and the computed spread. That is the most persuasive evidence there is.
2. **Make the "How it works" section a fully scrubbed sequence.** Today it is a sticky panel; a scroll-driven timeline would make each stage morph (claim card → reply → four check marks → chip → signature), as in the award sites.
3. **Rehearse the live-model running state with a slowed mock.** A delay setting for the mock agent (it would need Java) would let the 4–5 minute running state be rehearsed and screenshotted honestly.
