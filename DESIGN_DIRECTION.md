# VERA design direction

Audience: Guidewire executives in a review room, on a projector or large screen, judging whether a student
prototype looks like a real InsurTech product and whether it really works. Industry: P&C insurance, claims,
AI governance. Research: see DESIGN_RESEARCH.md (27 sites, shortlist of 6).

The previous drafts (cream paper, editorial serif, tracked mono labels; then Geist + Instrument Serif on
off-white) landed in the two most common AI-generated looks. Drata uses the same Geist pair. This direction
replaces that look; it does not polish it.

## Three directions considered

### A. Data-noir
- **Palette:** near-black #05070D, graphite #11151F, one electric blue #3D7BFF, status colours on dark.
- **Type:** a light grotesk in caps for heads (like Spectral/Heron), mono captions.
- **Background:** black with a faint aurora of blue and teal, fine dot grid.
- **Imagery:** glowing 3D lattice of claims floating in space.
- **Motion:** smooth-scroll, pinned chapters, lattice that assembles from particles.
- **Mood:** cinematic, night-time trading floor.
- **Against it:** this is the category default for crypto and AI (DeepBook, Mercury, Linear, Drata, Sardine), dark UIs wash out on projectors, and "glowing blue on black" is the second AI-generated cliché.

### B. Editorial colour blocks
- **Palette:** bone #EFEBE3 ground with oxblood, saffron and deep teal blocks.
- **Type:** a heavy serif display plus a sans.
- **Background:** flat colour bands, no gradients.
- **Imagery:** large cut-paper shapes of policies and documents.
- **Motion:** blocks slide and stack as you scroll.
- **Mood:** a well-designed annual report.
- **Against it:** saffron and oxblood collide with the review-amber and blocked-red status meanings, and serif on bone is the look we are leaving.

### C. Cobalt Ledger (chosen)
- **Palette:**
  - **Ink** #070D24: navy-black, the night of the hero and the shell.
  - **Cobalt** #2340FF: the brand. It is used as drenched fields, not as a thin accent.
  - **Ice** #DCE3FF: lit edges, secondary text on cobalt.
  - **White** for type.
  - **Canvas** #F4F5F8, cool and not beige, for the working dashboard.
  - **Status** keeps its meaning: certified green, review amber, blocked red, incomplete slate. Status never borrows the brand blue.
- **Type:** Archivo variable (width axis 62–125, weight 100–900) as one family with two voices.
  - Expanded and black for oversized headlines and numerals (wdth 112–125, wght 800).
  - Normal width for UI text.
  - JetBrains Mono for case IDs, rule codes, raw agent output and tabular numbers.
  - Both are OFL and self-hosted.
- **Background and texture:**
  - The hero is a layered field: ink base, a low cobalt "dawn" glow at the bottom edge, an SVG grain overlay at about 6%, and a 32px ledger grid of hairlines that fades out towards the edges.
  - Content bands alternate between cobalt (drenched), white and ink.
  - Line work is drawn as thick rounded strokes, the way an underwriter's ledger rules a page.
- **Imagery (all ours, SVG/canvas, no stock):**
  - The **Case Lattice in 3D**: 36 isometric blocks in five rows (8, 8, 8, 8, 4) that rise into place. On the landing page they are neutral and illustrative. In the dashboard they are bound to real report data.
  - Abstract **policy cards and a shield** built from the same blocks.
  - **Pipeline line work**: a thick rule that runs from claim to agent to checks to batch status to a person.
- **Motion language:** "ledger ink".
  - Things are ruled in: lines draw, bars fill, numbers count, blocks settle into the lattice.
  - Landing: a scroll progress rule, staggered headline reveal, a pinned "how it works" sequence scrubbed by scroll, a marquee of the real rule codes, counters on recorded results, and a cursor spotlight on the hero lattice.
  - Dashboard: the lattice staggers in, bars fill, figures count up once, the drawer slides, the run animation pulses through the lattice rows, and chips animate after a decision.
  - Everything rests under `prefers-reduced-motion`, and every element has its final state in CSS so the page still works without JavaScript.
- **Mood:** a precise instrument with a loud signature colour. Klein-blue confidence on a navy night; the feeling of a regulator's ledger made modern.

## Why C
1. **Ownable in the category.** Research shows the field is safe white SaaS (Credo AI, Vanta, Palantir) or black with a thin blue (DeepBook, Linear, Sardine). A *drenched* cobalt with giant expanded type sits in neither group. Coalition proved that insurance can be loud.
2. **Insurance-appropriate.** Blue is the trust colour of the industry. Making it saturated and graphic keeps the trust and loses the corporate baby-blue.
3. **Projector-safe.** The working dashboard stays light (canvas #F4F5F8, surfaces white). Only the shell and the verdict band use ink. White on cobalt is 6.5:1, ice on cobalt 5.1:1, white on ink 19.2:1, cobalt on the canvas 5.9:1.
4. **Status stays meaningful.** The brand is blue, and the statuses are green, amber, red and slate. Nothing in the brand can be mistaken for a pass or a fail.
5. **The product is the picture.** The signature image is the case lattice, which is also the main dashboard visual. That links the landing page to the working app the way At-Bay and Ramp use their own UI as proof.

## Rules
- The cobalt fields carry headlines and big numbers, never long paragraphs.
- One expanded headline voice per screen, with UI text at normal width.
- Every number is real (report or recorded results) or shows "—"/"Unknown".
- No logos of other companies, no Guidewire marks, no stock photos, no purple.
