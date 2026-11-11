# VERA design system: "Cobalt Ledger"

Written from the built pages (src/main/resources/static). Reasons and alternatives: DESIGN_DIRECTION.md.

## Tokens (`assets/css/tokens.css`, the only source)
- **Brand:** ink #070d24, cobalt #2340ff (white on it 6.5:1), cobalt-lit #6e7fff (on ink), ice #dce3ff.
- **Working surfaces:** canvas #f4f5f8, surface #fff, hairline #e3e6ee (table rules only), rule #8a93a8 (control borders, 3:1), muted #5a6378 (5.5:1).
- **Status (meaning only, always with an icon and a label):** certified #1f6b47, review #9a5b00, blocked #b42318, incomplete #565878, no data #6b7280. Each has a tint and a fill. On ink, `.on-ink` swaps in lighter values (all ≥6.3:1).
- **Scopes:** `.on-ink` (shell, bands, hero, footer), `.on-cobalt` (marquee, close), `[data-theme="dark"]` (whole dashboard).
- **Type:** Archivo variable. Headlines and numerals use weight 800–900 at width 112–125%; UI text uses weight 400–700 at normal width. JetBrains Mono for IDs, rule codes, raw agent output and commands. Every metric uses tabular figures. Body text is at least 16px, data at least 14px.
- **Space:** 8px unit (4 to 128). Content width up to 1440px, side margin clamp(16px, 3.4vw, 64px).
- **Radius:** controls 8px, panels 14px, pills 999px. Landing cards use 20–22px.
- **Elevation:** layers with hairlines. One soft lift for floating panels, one overlay shadow for the drawer and dialog. No coloured glows.
- **Texture:** inline SVG grain at 7% alpha and a 32/48px ledger grid, on ink only.
- **Motion:** 150 / 240 / 420 ms with ease-out cubic-bezier(.16, 1, .3, 1). Every animation has a final state in CSS, and `prefers-reduced-motion` removes it.

## Signature components
- **Case Lattice** (`lattice.js`): one block per claim, five rows (8, 8, 8, 8, 4).
  - Cell states: passed, failed, critical (hatched), not tested (hatched slate), unknown (?).
  - A cell carries a case ID only when the report names that case. Failed cells are links into the evidence drawer and can be reached with the arrow keys.
- **Verdict** (`verdict.js`): one sentence and a run-level chip. "Needs a person's decision" is defined once, from `pendingHumanReview`, and checked against the batch statuses.
- **Evidence Drawer** (`drawer.js`):
  - Deep link `#case/<id>/<dimension>`.
  - Shows the rule stated in plain words, the values the checker compared, and the raw agent output (as text only, never altered).
  - Previous/next, Esc to close, and focus returns to the control that opened it.
- **Review dialog** (`review.js`): native `<dialog>`. Name required, note optional. Guarded against double submits; errors appear inline.
- **Runs chart** (`runs.js`): small multiples with 70/90 bands. A line joins only runs with the same setup.
- **Landing:** isometric lattice on canvas (neutral, reacts to the pointer, can be paused), rule-code marquee, a "How it works" section pinned by scroll, results drawn from `assets/data/recorded-results.json`.

## Rules kept
No invented data. "Certified" always means VERA's own thresholds. No stock photos, logos or purple. No external requests at runtime.
