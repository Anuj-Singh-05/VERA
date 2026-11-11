# Animations, transitions and hover effects

Every motion in `landing.html` and `dashboard.html`. Paths are under `src/main/resources/static/assets/`.
`prefers-reduced-motion: reduce` turns all of them off (`css/base.css` sets durations to 0.01ms, and each file
has its own reduced-motion rules). On the landing page, the Pause control stops the rule marquee.

## Landing page

| Effect | Trigger | Duration / timing | File |
|---|---|---|---|
| First-visit intro: the lattice fills the screen, then zooms out | First load per session (`sessionStorage`); click, key or wheel skips it | Cells in 14ms stagger, zoom-out 650ms at about 850ms, 1.5s in total | `js/landing.js`, `css/landing.css` (`.intro`) |
| Headline words rise in | Page load (`.split-ready.in`) | 900ms each, 55ms stagger | `js/landing.js`, `css/landing.css` |
| Hero copy, CTAs and facts fade up | Page load (`.reveal-up`) | 600ms, 450ms delay | `css/landing.css` |
| Hero lattice cells appear | Page load | 380ms each, 16ms stagger, 300ms delay | `css/landing.css` (`cellOn`) |
| Hero callouts fade in | 900ms after load (`.hl.on`) | 400ms, 120ms stagger | `js/landing.js`, `css/landing.css` |
| Hero lattice cell fills ink | Hover | 140ms | `css/landing.css` |
| Scroll progress bar | Scroll (rAF-throttled) | Continuous | `js/landing.js`, `css/landing.css` (`.progress`) |
| Nav link underline follows the current section | Scroll | Instant | `js/landing.js` |
| Rule-code marquee | Always; the Pause button stops it | 46s loop | `css/landing.css` (`marq`) |
| Section reveals | Enters the viewport (IntersectionObserver) | 700ms fade and rise | `js/landing.js`, `css/landing.css` (`.reveal`) |
| Results counters count up | Section revealed | 1100ms, ease-out quart | `js/landing.js` (`countIn`) |
| Results bars draw in | Section revealed | 1s width transition | `css/landing.css` (`.rc-fill`) |
| How it works: pipeline line fills, active node and step | Scroll | Continuous; colour 220ms | `js/landing.js` (`updatePipe`), `css/landing.css` |
| Close-section lattice fills cell by cell | Section in view (30%) | 300ms per cell, 22ms stagger | `js/landing.js`, `css/landing.css` |
| Buttons invert | Hover | 140ms | `css/components.css` |

## Dashboard

| Effect | Trigger | Duration / timing | File |
|---|---|---|---|
| Overview lattice scans in, column by column, with a passing orange line | First render of a run | 420ms per cell (55ms per column, 18ms per row); line 900ms | `js/dashboard.js` (`--col`, `--row`), `css/dashboard.css` (`scanIn`, `scanLine`) |
| Stat numbers count up | First render of a run on Overview or Batches | 900ms | `js/dashboard.js` (`countUp`) |
| Pass-rate bar fill | First render (`.enter`) | 700ms | `css/dashboard.css` (`fill`) |
| Batches equaliser bars rise | Batches render | 800ms, 35ms stagger | `css/dashboard.css` (`eqIn`) |
| Runs timeline bars grow | Runs render | 700ms | `css/dashboard.css` (`grow`) |
| Reviews stamps land | Reviews render | 500ms | `css/dashboard.css` (`stampIn`) |
| Status chip stamp | Status changes after a review | 700ms | `css/components.css` (`stamp`) |
| Changed lattice or batch row flashes | Status changes after a review | 1.6s | `css/dashboard.css` (`rowHl`) |
| Run progress bar | Run in progress | 1.2s loop | `css/dashboard.css` (`tape`) |
| Lattice sweep line | Run in progress | 1.4s loop | `css/dashboard.css` (`sweep`) |
| Lattice cell callout (case, rule, expected vs actual) | Hover or focus on a failed cell | Instant | `js/dashboard.js` (`showTip`) |
| Legend item dims every other state | Hover on a legend item | 220ms opacity | `js/dashboard.js`, `css/dashboard.css` (`body[data-dim]`) |
| Waiting or batch row lights its lattice row | Hover | Instant | `js/dashboard.js` (`.lrow.hot`) |
| Batch row marks its cells | Click on a Batches row | Instant | `js/dashboard.js` (`tr.marked`) |
| Findings matrix square fills, matching rows light | Hover; a click filters the list | 220ms | `js/dashboard.js`, `css/dashboard.css` (`.fm-cell`) |
| Runs point: crosshair, tooltip, linked timeline bar and table row | Hover or focus on a point | Instant | `js/dashboard.js` (`showPointTip`), `css/dashboard.css` |
| Evidence drawer slides in, scrim fades in | A finding opens | 380ms and 220ms | `css/dashboard.css` (`.drawer`) |
| Review dialog rises | Approve or Reject | 220ms | `css/components.css` (`dlgIn`) |
| Toast slides up | After an action | 220ms | `css/components.css` |
| Active-tab bar in the tab colour | View change | Instant | `css/dashboard.css` |
