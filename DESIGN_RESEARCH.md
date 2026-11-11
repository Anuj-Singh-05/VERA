# VERA design research

Date: 11 Nov 2026 (overnight, unattended). Method: read-only browsing in the Claude built-in browser.
For every site I loaded the live home page and recorded, from the rendered DOM: the h1 and its computed
type, every font family in use, the section background colours (and whether gradients are used), counts of
canvas / video / SVG / images, which animation libraries are present on `window` (GSAP, ScrollTrigger,
Lenis, Three.js, Barba, Swiper, Lottie), the number of sticky (pinned) elements, and the page height.
I took screenshots of the strongest candidates. No sign-up, login, form, consent banner, purchase or
download was touched.

Caveat: the browser pane was about 800px wide, so measured font sizes are the sites' tablet/narrow sizes,
not their desktop sizes. Screenshots timed out for most of the night (the pane was hidden), so most notes
come from the DOM data plus the text; screenshots exist for Phoenix, DeepBook, Coalition, Tines, Wiz, At-Bay.

Sources used to find sites: Awwwards (Finance, Technology and Sites-of-the-Day listings), plus real
fintech, insurtech, security, compliance and AI-governance product sites. Land-book's category filter did
not apply in the session (it showed its general feed), so it yielded no usable fintech entries.

## Sites reviewed (27)

| # | Site | Category | What it is built from (measured) | Fit for VERA (Guidewire execs, insurtech, AI governance) | Techniques worth borrowing |
|---|---|---|---|---|---|
| 1 | https://endcap.design/ | Agency (Awwwards) | "Endcap Grotesk" 900 at 170px with -12px tracking; Fraunces; four flat grounds (bone, chartreuse, near-black, sand); square buttons | Low for tone, high for nerve | Scale contrast between giant heads and small text; whole sections as flat colour bands |
| 2 | https://www.roomandpillar.com/ | Proptech/insurance VC | Two grounds only (near-black, off-white); Diatype + Fraktion Mono labels; portfolio as a plain table | Medium: insurance subject, investor tone | Mono labels on tables; one concrete paragraph about claims as the story |
| 3 | https://www.stellarmanagement.com/ | Real estate | One family (General Sans) carries all hierarchy; deep navy band; "Key figures" block | Medium | Eyebrow-free figure blocks; navy as the serious colour |
| 4 | https://beady.ai/ | Risk intelligence | Satoshi 80px; tinted greens; small real UI fragments (one entity across a day); "every finding linked to its source" | High: evidence-backed risk | Evidence linking as the promise; timeline fragment; disclaimer for illustrative names |
| 5 | https://www.honeyquote.com/ | Consumer insurance | Instrument Serif regular heads; cream + forest green + terracotta | Low-medium | Plain-language "what it covers" sentences; steps as verbs |
| 6 | https://www.vanta.com/ | Compliance | SC Ripley serif 56px over Söhne; near-white grounds; one purple band; framework list | High for structure | Checks as a list of name + one line; calm enterprise rhythm |
| 7 | https://arize.com/phoenix/ | AI observability | Near-black (#010709); Bricolage Grotesque 200 weight; IBM Plex Mono for commands; hub diagram of integrations | High: evaluations, traces, drill-down | Dark technical hero; the real command to run; aggregate → item → raw trace |
| 8 | https://spectral-finance.webflow.io/ | Credit-risk protocol (Awwwards HM) | All black; Articulat CF light 300 in caps; 7 videos; 3 sticky elements | Medium: credit risk, but crypto mood | Light-weight caps heads on black; pinned product sections |
| 9 | https://capital45.com/ | AI for finance (Awwwards nominee) | Navy #141D29; PT Serif heads | Medium | Serif on navy reads institutional; otherwise thin |
| 10 | https://deepbook-v2-wip.webflow.io/ | DeFi order book (Awwwards SOTD) | Black hero, electric blue #1E6EF3 accent, gradient fields, a canvas; **GSAP + ScrollTrigger + Lenis**; TWK Everett | High for motion craft | Giant centred claim on black; smooth-scroll storytelling; one saturated blue against black |
| 11 | https://heronaiapp.com/ | AI agent (Awwwards SOTD) | BT Grotesk caps + Geist Mono; canvas; GSAP, ScrollTrigger, Lenis, Barba page transitions; 132 SVGs | Medium | Caps grotesk headlines with mono captions; page transitions |
| 12 | https://grail-app.com/ | Consumer app (Awwwards SOTD) | Black and #F6F6F6; PP Pangaia serif; 6 canvases; Lenis | Low tone, high craft | Alternating black/white chapters; big quote-like section heads |
| 13 | https://stripe.com/ | Payments | Söhne 300; layered animated gradient, navy #0D1738 band; 2 canvases; 5 sticky elements; 159 SVGs | High: the bar for data storytelling | Layered gradient field; product UI as illustration; sticky explainer sections |
| 14 | https://ramp.com/ | Spend management | Lausanne; white ground; 9 canvases, 3 videos | Medium-high | Product UI in motion as the hero; dense but calm |
| 15 | https://mercury.com/ | Banking | Dark #171721; Arcadia display; 5 videos | Medium | Night-time cinematic hero; restraint in colour |
| 16 | https://www.coalitioninc.com/ | **Cyber insurance** | Black hero + a saturated orange/red/black/white colour block made of thick rounded "pipe" lines with round icons; Degular + Degular Mono; Public Sans body; 5 videos | **High: insurance, bold, graphic** | Insurance can be loud: a drenched colour block built from thick line work; mono labels for data |
| 17 | https://www.wiz.io/ | Cloud security | White + vivid blue #0254EC + gradient; hand-drawn blue line illustration; 506 SVGs; logo wall | Medium-high | One saturated blue as identity; line illustration of the product idea |
| 18 | https://www.credo.ai/ | **AI governance** | White; Instrument Sans; GSAP; 109 images; "We made the list!" | High subject fit, low visual distinction | Shows what to avoid: safe white SaaS with badges |
| 19 | https://linear.app/ | Product tool | #08090A; Inter Variable + Berkeley Mono; gradient lighting | Medium | Dark UI screenshots lit from above; precise type |
| 20 | https://drata.com/ | Compliance | #09090A; **Geist + Geist Mono**; space metaphors ("orbit", "mission control") | Medium | Proof that Geist/Geist Mono is now the compliance-SaaS default: VERA should leave it |
| 21 | https://www.palantir.com/ | Enterprise AI | White/#EFEFEF; Alliance No.1/No.2; 6 videos | Medium | Austere, confident; very little decoration |
| 22 | https://column.com/ | Bank infrastructure | White + #011821 deep teal-navy + gradient; SuisseIntl; 223 SVGs | Medium-high | Diagram-heavy, infrastructure drawn as line art |
| 23 | https://www.unit21.ai/ | Fraud/AML AI | Baskerville heads, DM Sans, Space Mono; black and white with gradient | High subject fit | Serif authority over a technical subject; but the font mix is busy |
| 24 | https://www.tines.com/ | Security automation | Roobert + Roobert Mono + Reckless serif; pale cream with violet type; hand-made colourful 3D flower illustration; 7 canvases | Medium | Commissioned, characterful illustration makes it memorable (we must make ours in SVG) |
| 25 | https://www.at-bay.com/ | **Cyber insurance** | GT America 300; deep navy #002050 → blue gradient hero; product dashboard (risk gauge, scores) as the hero image; GSAP + ScrollTrigger | High: insurance + dashboard as proof | Real product UI as hero proof; navy-to-cobalt gradient; gauge-like summary visual |
| 26 | https://www.sardine.ai/ | Fraud/compliance | Near-black navy (lab 3.5); FK Grotesk Neue + FK Grotesk Mono | Medium-high | Grotesk + matching mono pair on dark navy |
| 27 | https://www.chainguard.dev/ | Supply-chain security | #0D161C; Gellix + Roobert SemiMono; canvas | Medium | Dark teal-navy ground; semi-mono labels |

## Skipped or blocked (recorded as asked)
- https://www.lemonade.com/ : Cloudflare "Performing security verification" page (HTTP 403). Skipped.
- https://www.hippo.com/ : same Cloudflare check (HTTP 403). Skipped.
- https://securedfi.studiovoila.com/ (Awwwards "Secured Finance"): navigation refused by the browser. Skipped.
- Land-book fintech filter: did not apply; general feed only. Dribbble, Behance, Godly, Mobbin, Lapa Ninja and Saaspo were not reached in the time available.

## What the research says
1. **Everyone in this category is either safe white SaaS or near-black with one blue.** Credo AI, Drata, Vanta
   and Palantir read interchangeable; Drata even uses the same Geist + Geist Mono pair VERA had.
2. **The memorable ones commit to a graphic idea**: Coalition's drenched colour block of thick line work,
   Tines' commissioned illustration, Endcap's giant type, Stripe's gradient field.
3. **The credible ones show the product**: At-Bay and Ramp put real dashboard UI in the hero; Beady shows
   one entity's record. For VERA, the case lattice and the evidence drawer are that proof.
4. **Motion craft** on award sites is GSAP + ScrollTrigger + Lenis (DeepBook, Heron, At-Bay). VERA can do
   the same ideas (pinning, scrubbed progress, staggered reveals) with sticky positioning, IntersectionObserver
   and a single rAF scroll loop, with no vendored library.

## Shortlist (6)
1. **Coalition**: insurance allowed to be loud; colour blocks built from thick line work.
2. **DeepBook**: black/electric-blue cinematic hero and scroll-driven storytelling.
3. **At-Bay**: insurance + real product dashboard as the proof, navy-to-cobalt field.
4. **Arize Phoenix**: AI-evaluation vocabulary, drill-down from aggregate to raw trace.
5. **Beady AI**: every finding linked to its source; small real UI fragments.
6. **Stripe**: layered gradient fields and sticky, scroll-explained product sections.

Take principles only. No layout, copy, illustration, logo or code is copied from any of them.
