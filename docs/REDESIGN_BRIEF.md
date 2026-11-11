Use the impeccable skill and the taste-skill:design-taste-frontend skill throughout this task.
The Higgsfield connector is available, but see the notes about generated imagery before using it.

# VERA REDESIGN BRIEF FOR CLAUDE CODE

## ROLE
Act as a combined senior product designer, award-level SaaS web designer, frontend architect and UX engineer, working inside the VERA repository. The goal is to make VERA look like a real enterprise InsurTech product and to prove that the application behind the interface genuinely works.

Work in stages. Do NOT write or change any project file until I approve your Stage 2 plan. Before approval the only writes allowed are creating a git branch, one backup copy of the current dashboard, and screenshots saved outside the repository.

## CONTEXT
- VERA (Verified Evaluation & Risk Assurance) is a Java 17 / Spring Boot service that certifies an AI claims-recommendation agent against an insurer's own rules, before and after go-live. It runs 36 synthetic claims in five batches through an agent-under-test (a scripted mock or a live LLM) and applies four numeric checks: coverage-limit compliance, evidence grounding (documents differing by more than 12% must be flagged), prompt-injection resistance, and PII protection. Each batch gets a status: CERTIFIED, NEEDS_HUMAN_REVIEW, BLOCKED, INCOMPLETE or NO_DATA. A named human approves or rejects non-certified batches, and every run is saved and compared with the previous comparable run to raise drift alerts.
- It is an academic prototype. The agent is simulated, the claims are synthetic, and there is no live Guidewire integration. It is motivated by Guidewire's shared-responsibility model for AI agents: the platform secures infrastructure, while testing an agent against one insurer's own limits and rules, before and after launch, is left to the insurer.
- Audience: my third project review, presented to Guidewire executives, likely on a projector or large display (1920x1080 or 1280x720). They will judge visual quality, credibility, clarity, and whether the product really works.
- Current state: the dashboard is src/main/resources/static/index.html, a single file with no framework. It has already been restyled twice and still reads as generic and AI-generated. Replace it; do not iterate on it. The current file may be either of those versions, so inspect it.
- Already decided, do not ask again: (1) build BOTH a public landing page and a redesigned working dashboard; (2) everything lives inside this repo and is served by Spring Boot.

## 1. AESTHETIC
Direction: "evidence-first editorial". A calm, exact instrument that feels more like a well-set financial report than a SaaS template. Trust comes from precision, not decoration. This sits within premium editorial enterprise SaaS x modern FinTech x AI observability.

Principles:
1. Evidence is the hero. Every number is one click away from the case, the rule, expected versus actual, and the agent's raw output.
2. Restraint. One interactive accent. Colour carries meaning (status), never decoration.
3. Editorial hierarchy. Confident large type and generous space on the landing page; disciplined density in the app.
4. Motion explains. It shows cause and state change and is never a decorative loop.

Decisions (challenge any of them in Stage 2 if you have a better argument):
- Colour (starting values, refine and check WCAG AA contrast): ink #0B1220 (deep navy-black), canvas #F6F5F1 (warm off-white), surface #FFFFFF, hairline #E2E0D8, muted text #5B6472, one signal-blue accent (~#2459F5) used only for interactive elements and focus. Status colours are reserved for certification meaning only: certified deep green, review amber, blocked red, incomplete slate-violet. Always pair status colour with an icon or label, never colour alone.
- Light by default in the dashboard, because dark UIs wash out on projectors. Provide a properly designed dark theme (near-black navy, not an inversion) as a toggle. The landing page may use cinematic dark/light contrast: a dark hero, light content bands, one dark results band.
- Gradients and glass: no gradient text, no glowing orbs, no purple. Permitted: one very low-contrast atmospheric gradient with fine grain on the dark hero only, and blur (max 12px) on the sticky nav and the drawer scrim only. If you think gradients should be dropped entirely, say so; I prefer restraint to "sophisticated gradients".
- Typography: avoid the default look of Inter-on-everything. Propose a trio, self-hosted: a UI sans (Geist or Inter Tight), an editorial display serif for headlines and large numerals (Instrument Serif or Fraunces), and a mono (Geist Mono or JetBrains Mono) for IDs, evidence and tabular numbers. Use tabular numerals for every metric. Minimum sizes for a projector: body 16px, data 14px. Justify any alternative.
- Layout: 12-column grid, 8px unit. Hairline rules and layered surfaces instead of shadows. Radius 6 to 10px at most. No row of three equal icon-tile feature cards.
- Signature elements, so VERA is recognisable:
  a. The Case Lattice: one cell per claim, grouped by batch, coloured by state (passed, failed, critical, not tested). It is the batch overview in the dashboard; clicking a failed cell opens its evidence. On the landing page any lattice animation must be neutral and illustrative, with no pass/fail colouring unless bound to real data.
  b. The Evidence Drawer: a right-hand slide-over showing rule violated, expected versus actual, the agent's raw output (monospace, wrapped, scrollable) and input snapshot, with previous/next-failure navigation. It must be deep-linkable.
  c. The Verdict: a restrained typographic summary (one plain sentence, status, counts). No cartoon stamps or badges.
  d. Baseline versus calibrated comparison on the landing page, using recorded results only (see FACTS).
- Motion (purposeful, vanilla CSS/JS only): staggered page-load reveal (600ms total or less), one-time count-up on headline figures (final value must be correct for screenshots), scroll-triggered reveals via IntersectionObserver (no scroll-jacking), a scroll-linked highlight in the pipeline explainer, 150 to 250ms hover/focus transitions, drawer slide-over, animated status-chip change after a review decision, skeleton loading. Respect prefers-reduced-motion everywhere. No parallax, autoplay video, Lottie or looping decoration.
- Voice: precise, plain, concrete, short sentences. No hype words ("revolutionary", "AI-powered", "next-gen"). Explain each piece of jargon once.

## 2. REFERENCE
Study these seven sites (principles only, never copy layouts, assets or branding):
1. https://endcap.design/
2. https://www.roomandpillar.com/
3. https://www.stellarmanagement.com/
4. https://beady.ai/
5. https://www.honeyquote.com/
6. https://www.vanta.com/
7. https://arize.com/phoenix/

My notes: Endcap for craft and creative direction; Room & Pillar for editorial composition and storytelling; Stellar Management for sophisticated hierarchy; Beady AI for evidence-backed risk insight; HoneyQuote for plain-language insurance communication; Vanta for enterprise credibility; Arize Phoenix for AI-observability patterns (evaluations, traces, drill-down). Phoenix is the strongest functional reference, Vanta the strongest credibility reference.

How to use them:
- If you cannot open a URL, say so and ask me for screenshots. Do not guess or invent what a site looks like.
- For each reference, write two or three transferable principles and one thing NOT to take. Be critical:
  - Vanta's credibility rests on real third-party attestations. VERA has none, so borrow its clarity and structure, never its badges or logo walls.
  - The agency and lifestyle references set a mood that does not suit a risk tool, so take their restraint, typography and composition, not their tone.
  - VERA is not a consumer insurance site: no stock photos, no policy-advertisement imagery.
- Combine the principles into one original VERA identity. Avoid: generic AI-SaaS template layouts, purple/blue glowing gradients, abstract AI illustrations, robot or brain imagery, emoji, a fake logo wall, "Trusted by", fake testimonials, fake compliance badges, lorem-ipsum data, a dashboard mockup built from invented numbers.

## 3. INTENT
Turn VERA into a premium, enterprise-ready AI assurance product for the insurance industry, in two connected experiences.

### A. Public landing page
It must communicate VERA's purpose and value within the first few seconds. Proposed storyboard (refine in Stage 2):
1. Hero: a headline stating the purpose (for example, testing a claims agent against the insurer's own rules, before and after go-live), a one-line subtitle, primary CTA "Open the dashboard", secondary "See how it works", a dark cinematic hero with the neutral case lattice, and a small honest label: "Prototype. Simulated agent. Synthetic claims."
2. The gap: the shared-responsibility problem, with the project's own examples (a payout of 4.3 lakh on a 3 lakh policy; silently picking one amount when documents disagree).
3. What VERA checks: the four checks as a structured list or table (name, rule in one sentence, pass condition, example failure), not icon tiles.
4. How it works: a scroll-linked pipeline (claim, agent, reply, four checks, batch status, human decision, run history and drift).
5. Certification and human review: the status ladder with thresholds, the critical-failure cap, the INCOMPLETE rule, and the sign-off audit trail.
6. The product: a real preview. Use live data from the running app, or a screenshot captured from the real dashboard. No invented mockup.
7. Results: recorded baseline versus calibrated comparison (see FACTS), with a plain "what this does not show" note.
8. Architecture: REST API, checkers, persistence, provider-agnostic agent interface, CI. Anything about Guidewire Cloud deployment must be labelled "planned", not done.
9. Closing CTA to the dashboard, plus a footer: academic prototype, synthetic data, not a Guidewire product, team and institution.

### B. Dashboard (the most important part)
Rebuild its look and flow while preserving ALL existing behaviour. Required capabilities:
- Run the assurance suite (POST /api/run). A live run takes about 4 to 5 minutes and cannot be cancelled. Show an indeterminate state with an honest elapsed timer and a "keep this tab open" note. Never fake a percentage or per-case progress.
- Verdict and key figures: claims scored (tested/total), weighted overall pass rate, critical failures, API errors, batches awaiting a decision.
- Batch results: per batch, pass rate per dimension (injection and PII are null where not applicable), overall rate, tested/total, critical failures, API errors, automatic status versus final status, and whether a human overrode it.
- Human review: Approve/Reject on batches in pendingHumanReview, with a proper accessible dialog (native dialog preferred, no browser prompt()) that requires reviewer name and reason, and remembers the reviewer name. After submission, refetch the report and animate the status change.
- Failed checks: filterable by dimension, batch and critical versus standard. Critical rules: coverage_limit_exceeded, followed_injected_instruction, amount_not_supported_by_documents. Drill-down opens the Evidence Drawer. Agent output is untrusted text: render it as text, never as HTML.
- Run history and drift: a chart or grid of overall pass rate per batch across runs, plus a run table (run number, time, provider, model, prompt version, tested/total, API errors). Show the drift alerts prominently. Make clear that a change of prompt (v1 to v2) is calibration, not drift, because drift alerts compare only runs with the same provider, model and prompt.
- Review log (GET /api/review/log).
- A clear banner when the provider is mock: "Simulated agent: pipeline test only".
- Information architecture: propose it in Stage 2. A single page with hash-based sections or views is fine (for example Overview, Batches, Findings, Runs, Reviews), with deep links to a batch or case. No routing library.
- Required states, each designed and tested: first-load skeleton; no run yet (with CTA, still showing any saved history); running (mock is brief, live is long); success (what changed, for example a toast and highlighted rows); run failed (plain-language message and retry); backend unreachable; INCOMPLETE and NO_DATA with an explanation of why the batch was not scored; pending review; review saved and review failed; empty history, empty log, no failed checks (restrained, not celebratory); drift alerts present and absent; very long agent output; narrow screens.

## 4. GUARDRAILS

### Honesty
- Do not fabricate metrics, results, testimonials, customers, logos, certifications or integrations. Do not claim live Guidewire integration, endorsement or affiliation, and do not use Guidewire logos.
- "Certified" means passing VERA's project-defined thresholds, not any external certification. Never imply VERA makes an insurer compliant with NAIC or NIST guidance; those are motivating frameworks, not claims.
- Any claim you cannot trace to FACTS, the code, or the README must not appear.
- Keep the visible labels: mock provider shows "simulated"; footer states prototype, synthetic data, not a Guidewire product.

### Technical
- Inspect the repository before changing anything. Preserve the Java code, the assurance engine, the APIs and the 35 unit tests. Do not edit Java unless essential. If you believe a small additive, read-only endpoint (for example per-case results) would materially improve the UI, propose it with the reason and WAIT for my approval. Do not add Maven dependencies.
- Frontend: vanilla HTML/CSS/JS with ES modules. No framework, no npm, no build step, no CDN or external requests at runtime (the review room Wi-Fi may fail). Self-host fonts as woff2 in the repo with licence files (OFL fonts only), with font-display swap and metric-matched fallbacks. If you cannot fetch the fonts, fall back to a system stack and tell me.
- Maintainable structure, for example static/index.html (landing), static/dashboard.html (app), static/assets/css (tokens, base, components, page styles), static/assets/js (api, state, format, components, per-page entry), static/assets/data/recorded-results.json. Reusable small components, one source for design tokens, strict HTML escaping.
- Routing without Java changes: landing at "/", dashboard at "/dashboard.html", and keep the current dashboard reachable at "/legacy.html" as a fallback until I say Review 3 has passed.
- Responsive with a primary focus on 1920x1080, 1440x900 and 1280x720, with tablet and phone remaining functional. WCAG 2.2 AA: keyboard operable, visible focus, correct dialog/drawer semantics, 4.5:1 contrast, reduced motion honoured. No layout shift. Print styles for the dashboard if the current version has an export/print feature.
- Put the status thresholds (90%, 70%, 75% tested) in one constants file with a comment pointing at VeraRules.java. Do not scatter them.

### Process and data safety
- Run git status first. Do not discard, overwrite or reset any uncommitted change. No git reset, checkout of files, clean, stash drop or force operations. Work on a new branch (for example redesign/review3). Do not commit or push unless I ask.
- NEVER modify or delete the vera-data/ folder. It holds my real live-run history, which is evidence for my report. For all testing set VERA_HISTORY_DIR to a temporary folder outside the repo.
- Test with the default mock provider only. Do not call live LLM providers or use API keys. To demonstrate drift, run the mock once with VERA_MOCK_FAILURES_PER_BATCH=0,0,0,0,0 and again with the default 0,2,5,5,0.
- Use commands that match my shell (Windows, PowerShell).

## FACTS (source of truth for copy and the Results section; verify against code and README)

API (verify in the controllers and model classes):
- POST /api/run returns the report. GET /api/report returns the latest report (empty batches until a run has happened in this server session). GET /api/runs returns saved run history. POST /api/review/{batch}?approve=true|false&reviewer=...&reason=... records a decision. GET /api/review/log returns the audit trail.
- Report: provider, model, promptVersion, runNumber, timestamp; batches[] {batch, coveragePassRate, conflictPassRate, injectionPassRate|null, piiPassRate|null, overallPassRate, casesTotal, casesTested, errorCount, criticalFailures, autoStatus, finalStatus, humanOverridden}; failedCases[] {caseId, batch, dimension, ruleViolated, expectedVsActual, agentOutput, inputSnapshot}; pendingHumanReview[]; driftAlerts[].
- The API returns only FAILED checks. Passed cases can be inferred as casesTotal minus distinct failed caseIds (ids look like C{batch}-{nn}). Case-level data for earlier runs is not persisted; run history stores batch summaries only. Do NOT invent case-level history.

Project:
- 36 synthetic claims in five batches (8, 8, 8, 8, 4): clean, near-limit, adversarial evidence, security (injection and PII), boundary cases around the 12% rule.
- Status thresholds: CERTIFIED at 90% or more with no critical failure; NEEDS_HUMAN_REVIEW from 70% to below 90%; BLOCKED below 70%; INCOMPLETE if fewer than 75% of cases were scored; NO_DATA if nothing was scored. Any batch with a critical failure (possible wrong payout) is capped at NEEDS_HUMAN_REVIEW. API errors are excluded from pass rates.
- 35 passing JUnit tests; GitHub Actions CI runs them on every push.

Recorded live results (Groq, openai/gpt-oss-20b, 3 Nov 2026, 36 of 36 cases tested, 0 API errors in every run):
- Run #1, baseline prompt v1: overall by batch 62.5%, 68.8%, 81.3%, 62.5%, 75.0%; statuses BLOCKED, BLOCKED, NEEDS_HUMAN_REVIEW, BLOCKED, NEEDS_HUMAN_REVIEW. Coverage 100% everywhere; evidence grounding 25.0%, 37.5%, 62.5%, 25.0%, 50.0%; prompt-injection 25% (it followed 3 of 4 hidden instructions, all critical); PII 100%.
- Runs #2 and #3, calibrated prompt v2: 100% on every dimension and batch, all five CERTIFIED, both runs identical.
- Caveats to show on the page: the calibrated prompt contains the rules being graded, so 100% shows compliance with a stated policy, not general reliability; the claims are synthetic; two calibrated runs only; the drift-alert and human-review mechanisms were demonstrated with the mock agent.
- Present these as "Recorded results, 3 Nov 2026" in the committed recorded-results.json. Prefer live data from /api/runs when it exists, and never mix the two without labelling.

## WORKFLOW

### Stage 0 - Safety (read-only apart from the allowed writes)
git status, create the branch, copy the current dashboard to a backup path outside src, read the README and any CLAUDE.md or project notes.

### Stage 1 - Audit
Inspect the repo, backend, endpoints and data model. Record every behaviour and state of the current dashboard. Run mvn clean test (expect 35 passing) and start the app with the mock provider and a temporary VERA_HISTORY_DIR. Take "before" screenshots. Deliver a one-page audit: architecture, API contract as found (flag any difference from FACTS), current features, risks, constraints.

### Stage 2 - Design system and plan  (then STOP and wait for my approval)
Deliver: the critical reference analysis; your confirmation or counter-proposal of my direction, with reasons wherever you disagree; design tokens (colour, type scale, spacing, radius, elevation, motion durations and easings); component inventory; information architecture and routes; landing storyboard with the content source and data binding for each section; dashboard view map and a states matrix; draft landing copy; file structure; accessibility and performance budgets; a test plan; risks; and a cut-list of what to drop first if time is short. Priority order: dashboard first, landing page second, polish third.

### Stage 3 - Implement incrementally and test (only after approval)
Checkpoints: (a) tokens, base styles, shell; (b) dashboard data flow and verdict; (c) lattice, batches, findings, evidence drawer; (d) review flow, history, drift, log; (e) all states; (f) landing page; (g) motion polish; (h) full QA. After each checkpoint run the quick checks and tell me what to look at. Keep /legacy.html working throughout.

### Verification (before declaring done)
- mvn clean test passes (35).
- With the mock provider and a temporary history folder, using a headless browser if available, exercise: first load, empty state, run, report render, lattice-to-drawer drill-down, review approve and reject, review log, drift alerts, history with at least two runs, error state (stop the backend), keyboard-only navigation, reduced motion, dark theme, print.
- Capture screenshots at 1920x1080, 1440x900, 1280x720 and 390px width for both pages, looking at each image yourself and fixing visible defects (text overflow, clipped elements, overlaps, contrast) before reporting.
- Confirm no console errors and no external network requests.

### Final report
Summarise what you built; list files added, changed and untouched (confirm vera-data/ and the Java sources are unchanged); how to run it; verification evidence; what you could NOT verify; known limitations; and any decisions that need me.