# HANDOFF: VERA dashboard redesign ("Paper Ledger")

## 1. Where things stand
- **Branch:** `redesign/review3`. `main` is untouched (still `deed17d`). Nothing is pushed or merged.
- **Last code commit:** `325e90e` (dashboard redesign round 1 plus design docs). This file is committed on top of it.
- **Working tree:** clean after the HANDOFF commit.

## 2. Finished and half-done
**Finished (earlier work, committed):**
- `/landing.html` (Cobalt Ledger look, left alone in this task).
- The dashboard's behaviour: run, verdict, lattice, drawer, review dialog, Runs, Reviews, fixtures, drift.
- `verdict.js` (one definition of "needs a decision").
- Docs: `REVIEW_NOTES.md`, `DESIGN_GAP_ANALYSIS.md`, `DESIGN.md`.
- `DESIGN_RESEARCH.md` "My 7 references": the honest account of how each reference was viewed, plus what was taken from it.
- `DESIGN_DIRECTION.md`: new section "Dashboard direction: Paper Ledger".

**Half-done: the dashboard redesign (round 1 of the 3 required).** Files:
- `src/main/resources/static/assets/css/dashboard.css`: rewritten. Ledger tokens in `:root.ledger`, light and dark.
- `dashboard.html`: `class="ledger"` on `<html>`, paper shell, demo notes `hidden`.
- `assets/js/dashboard.js`:
  - `phead()` slim headers and `emptyState()`.
  - Batches is now a ledger table (`.ltable.breg.stack`).
  - Findings has a mini lattice per row.
  - Reviews has a mini lattice and decision marks.
  - `?demo=1` shows the presenter notes.
- `assets/js/lattice.js`: `miniLattice()` and highlight support.
- `assets/js/runs.js`: ledger tables, latest-run row, batch-status blocks.

**Defects seen in the round 1 screenshots (not yet fixed):**
- **Overview "Waiting for your decision" rows:** the grid columns don't match the elements, so the status chip is clipped ("NEEDS R") and the bar column is empty.
- **Batches table at 1280:** the lattice column squeezes to 2 cells wide, and the batch name and description wrap into a narrow column.
- **Verdict sentence:** too long for the display size at 1920; consider a smaller size or a shorter sentence.
- **Not yet screenshot-checked:** Findings, Runs, Reviews and the drawer in the new look (the captures exist in `scratchpad\qa\shots-L\r1-D-*` but were not reviewed); 390 px in all views.
- **`print.css` not re-verified** with the new look. It still targets some old classes (`.verdict-band.on-ink`); re-check that the print is one page.
- **QA scripts in the scratchpad** (`cp-d.mjs`, `cp-e.mjs`) still reference old selectors (`.brow`, `.brow .rbar`). Update them before re-running the regression.

## 3. The task and the next step
**Task (your message):** give the dashboard a distinct identity and do not tweak the old look.
- Slim headers on Batches, Findings, Runs and Reviews, with data starting in the first 150 px.
- A palette other than cobalt-on-grey.
- Solid, flat status treatments instead of pastel pills.
- Ruled ledger tables with tabular mono numbers.
- Sharp corners and fewer cards and shadows.
- The case lattice motif on every tab.
- Fixed empty states and blank space.
- Demo box only with `?demo=1`.
- Light or dark chosen and justified for the projector.
- Iterate at least 3 rounds at 1920×1080, 1280×720 and 390, light and dark. After each round, list what still looks generic.
- Keep all behaviour and the 35 tests.
- Report with before and after screenshots, and say what was left alone.

**Next step:**
1. Fix the round-1 defects in section 2.
2. Review the remaining round-1 shots.
3. Run rounds 2 and 3, writing "still generic" notes after each.
4. Update and re-run the browser regression (run, drawer, approve/reject, log, drift, fixtures, keyboard, print, no external requests).
5. Write the report.

**Before screenshots** of the previous cobalt dashboard: `scratchpad\qa\shots-e\e4-D-*` and `scratchpad\final-screens\d-*`.

## 4. Rules and decisions still in force
- **Data:**
  - Never modify or delete `vera-data/` (it holds your real run history; run #7 is a mock run from 11 Nov 01:34, left as is).
  - Test only with a temporary `VERA_HISTORY_DIR` outside the repo.
  - Mock provider only: no live LLM calls, no API keys.
  - Never invent data. Lattice cells carry a case ID only when the report names that case; anything unaccounted for is "Unknown"; history is batch-level only.
- **Code:**
  - Do not change Java code, `pom.xml` or the 35 tests. Java changes would need new tests. The `/api/cases` endpoint was declined (D2).
  - No external network requests at runtime. Fonts are self-hosted (Archivo and JetBrains Mono, OFL). No JS libraries.
- **Git and processes:**
  - Work on `redesign/review3` and commit after each step. Never push, force, rebase, reset `--hard` or delete branches. Never touch `main`.
  - Do not kill processes you did not start. Port 8080 is currently held by a server that is not mine (pid 16036, started 15:16 via `mvn spring-boot:run`). Use other ports for tests (8091–8099 have been used).
- **Routes:**
  - `/` stays the old dashboard.
  - `/dashboard.html` is the new one.
  - `/landing.html` is the product page.
  - `/legacy.html` is the fallback.
  - The landing page is promoted to `/` only when you say so (command in `README.md`).
- **Honesty labels stay visible:**
  - Simulated agent.
  - Synthetic claims.
  - Not a Guidewire product.
  - "Certified" means VERA's own thresholds.
  - Guidewire Cloud only as "Future work".
  - No Guidewire logos.
- **Decisions:**
  - D3 footer credits: Anuj Singh, Mehak Sharma, Armin Parveen; guides Dr. Sandhia G K and Dr. Ranjani M; faculty advisor Mrs. Rekha G; course 21CSE734P; SRM IST Kattankulathur, Department of Computing Technologies.
  - D5: C4-02 is the real example; 4.3 lakh is illustrative only.
  - D6: Indian digit grouping, and the raw agent output is never altered.
- **Research:** browse read-only (no forms, logins, consent clicks or downloads), and record skipped sites.
- **Chosen dashboard direction (why):** Paper Ledger. Ink on paper with a lime highlighter, solid status blocks, ruled mono tables. Light was chosen because projector blacks wash out and pastels vanish. The lime comes from Endcap, Room & Pillar and Beady; the ruled, card-free data from Room & Pillar, Stellar and HoneyQuote. Full details in `DESIGN_DIRECTION.md`.

## 5. Commands (PowerShell, project root)
Start the app safely (your real history is not touched; pick a free port):

    $env:VERA_HISTORY_DIR="$env:TEMP\vera-dev"; mvn spring-boot:run "-Dspring-boot.run.addResources=true" "-Dspring-boot.run.arguments=--server.port=8097"

Open `http://localhost:8097/dashboard.html`. Test states: `?fixture=incomplete|nodata|apierror|long|many|zero`; presenter notes: `?demo=1`.

For drift data:
1. Run once with `$env:VERA_MOCK_FAILURES_PER_BATCH="0,0,0,0,0"`.
2. Stop the server.
3. Clear the variable with `Remove-Item Env:VERA_MOCK_FAILURES_PER_BATCH`.
4. Start the server again on the same history folder and run.

Tests:

    mvn clean test
    node --test src/test/js/verdict.test.mjs

(`mvn clean` wipes `target/` under any running dev server; restart it afterwards.)

## 6. Unsure or not verified
- **The new look has not been checked** at 390 px, in Findings, Runs, Reviews or the drawer, in print, or with the keyboard walk.
- **The lime highlighter next to the certified green** could be read as "good" by some viewers. It is never used for status, and status always has a label, but this is untested with real users.
- **The C4-02 baseline recommendation of 3,00,000** comes from your message; run history cannot confirm it.
- **The reference screenshots** are in the scratchpad, not the repo: `scratchpad\refs\`. Cookie banners on Beady, Vanta and Phoenix cover parts of some frames.
