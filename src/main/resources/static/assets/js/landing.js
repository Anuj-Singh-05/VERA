// Landing page motion. Vanilla JS, no libraries. Every effect is progressive: the page is complete
// without JS (html.no-js), and prefers-reduced-motion leaves everything in its final state.
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

/* ---------- Scroll progress + nav section highlight (one rAF-throttled scroll loop) ---------- */
const bar = $('#progress');
const navLinks = $$('.lnav-links a');
const sections = navLinks.map((a) => document.querySelector(a.getAttribute('href')));
let ticking = false;
function onScroll() {
  if (ticking) return;
  ticking = true;
  requestAnimationFrame(() => {
    const max = document.documentElement.scrollHeight - innerHeight;
    bar.style.transform = `scaleX(${max > 0 ? Math.min(1, scrollY / max) : 0})`;
    let current = -1;
    sections.forEach((s, i) => { if (s && s.getBoundingClientRect().top < innerHeight * 0.4) current = i; });
    navLinks.forEach((a, i) => a.setAttribute('aria-current', i === current ? 'true' : 'false'));
    updatePipe();
    ticking = false;
  });
}
addEventListener('scroll', onScroll, { passive: true });
addEventListener('resize', onScroll);

/* ---------- Headline: split into words and rise in once ---------- */
function splitWords(el) {
  let i = 0;
  const walk = (node) => {
    [...node.childNodes].forEach((n) => {
      if (n.nodeType === 3) {
        const frag = document.createDocumentFragment();
        n.textContent.split(/(\s+)/).forEach((part) => {
          if (!part) return;
          if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
          const w = document.createElement('span'); w.className = 'w';
          const inner = document.createElement('span'); inner.textContent = part; inner.style.setProperty('--i', i++);
          w.appendChild(inner); frag.appendChild(w);
        });
        n.replaceWith(frag);
      } else if (n.nodeType === 1) walk(n);
    });
  };
  walk(el);
}
const h1 = $('.split');
if (h1 && !reduced) {
  const label = h1.textContent;
  splitWords(h1);
  h1.setAttribute('aria-label', label);
  $$('.w', h1).forEach((w) => w.setAttribute('aria-hidden', 'true'));
  h1.classList.add('split-ready');
  requestAnimationFrame(() => requestAnimationFrame(() => h1.classList.add('in')));
}
requestAnimationFrame(() => $$('.reveal-up').forEach((el) => el.classList.add('in')));

/* ---------- Scroll reveals ---------- */
const io = new IntersectionObserver((entries) => {
  entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); onReveal(e.target); } });
}, { rootMargin: '0px 0px -12% 0px', threshold: 0.12 });
$$('.reveal').forEach((el) => (reduced ? el.classList.add('in') : io.observe(el)));

/* ---------- Counters (final values are already in the HTML) ---------- */
function countIn(root) {
  $$('[data-count]', root).forEach((el) => {
    const to = Number(el.dataset.count);
    if (reduced || Number.isNaN(to)) return;
    const t0 = performance.now();
    const step = (now) => {
      const k = Math.min(1, (now - t0) / 1100);
      el.textContent = String(Math.round(to * (1 - Math.pow(1 - k, 4))));
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });
}
function onReveal(el) { if (el.querySelector('[data-count]')) countIn(el); }

/* ---------- How it works: pinned pipeline driven by scroll ---------- */
const steps = $$('.step');
const nodes = $$('.pipe .node');
const pipeFill = $('#pipeFill');
let pipeLen = 390;
if (pipeFill && pipeFill.getTotalLength) { pipeLen = pipeFill.getTotalLength(); pipeFill.style.strokeDasharray = pipeLen; }
function updatePipe() {
  if (!steps.length) return;
  const mid = innerHeight * 0.5;
  let active = 0;
  steps.forEach((s, i) => { if (s.getBoundingClientRect().top < mid) active = i; });
  const first = steps[0].getBoundingClientRect();
  const last = steps[steps.length - 1].getBoundingClientRect();
  const span = (last.top + last.height / 2) - (first.top + first.height / 2);
  const prog = span > 0 ? Math.min(1, Math.max(0, (mid - (first.top + first.height / 2)) / span)) : 0;
  if (pipeFill) pipeFill.style.strokeDashoffset = String(pipeLen * (1 - prog));
  steps.forEach((s, i) => s.classList.toggle('on', i === active));
  $$('.how-vis .hv').forEach((v, i) => v.classList.toggle('on', i === active));
  nodes.forEach((n, i) => { n.classList.toggle('on', i === active); n.classList.toggle('done', i < active || (i === active && prog >= 0.999)); });
}

/* ---------- Recorded results: rendered from the committed JSON ---------- */
const STATUS = { CERTIFIED: 'Certified', NEEDS_HUMAN_REVIEW: 'Needs review', BLOCKED: 'Blocked' };
const NAMES = { 1: 'Clean claims', 2: 'Near the limit', 3: 'Adversarial evidence', 4: 'Security attacks', 5: 'Boundary cases' };
const pct = (v) => `${(v * 100).toFixed(1)}%`;
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
fetch('assets/data/recorded-results.json').then((r) => r.json()).then((d) => {
  const chart = $('#resChart');
  const rows = d.baseline.batches.map((b) => {
    const c = d.calibrated.batches.find((x) => x.batch === b.batch);
    const bar = (cls, v, s, label) => `<div class="rc-bar ${cls}"><div class="rc-track"><span class="rc-fill" style="--w:${(v * 100).toFixed(1)}%"></span><span class="rc-mark" style="left:70%"></span><span class="rc-mark" style="left:90%"></span></div>
      <span class="rc-val">${esc(pct(v))}<span class="mchip" data-s="${esc(s)}">${esc(STATUS[s] || s)}</span><span class="sr-only">${esc(label)}</span></span></div>`;
    return `<div class="rc-row"><div class="rc-name"><b>Batch ${b.batch}</b><span>${esc(NAMES[b.batch] || '')}</span><span class="rc-ev">Evidence ${esc(Math.round(b.evidence * 100))}% → ${esc(Math.round(c.evidence * 100))}%</span></div>
      <div class="rc-bars">${bar('rc-v1', b.overall, b.status, 'baseline v1')}${bar('rc-v2', c.overall, c.status, 'calibrated v2')}</div></div>`;
  }).join('');
  chart.innerHTML = `<div class="rc-legend"><span><i class="k1"></i>${esc(d.baseline.label)}, run #${d.baseline.runs.join(', #')}</span><span><i class="k2"></i>${esc(d.calibrated.label)}, runs #${d.calibrated.runs.join(' and #')}</span><span>Marks at 70% and 90%</span></div>${rows}`;
  $('#caveats').innerHTML = d.caveats.map((c) => `<li>${esc(c)}</li>`).join('');
}).catch(() => { /* keep the noscript-style text already in the page */ });

/* ---------- Close section: spotlight follows the pointer; lattice wave when in view ---------- */
const close = $('#close');
if (close) {
  $$('.cl-row i', close).forEach((el, i) => el.style.setProperty('--i', i));
  new IntersectionObserver(([en]) => close.classList.toggle('in-view', en.isIntersecting), { threshold: 0.3 }).observe(close);
}

/* ---------- Hero: the case lattice as a flat hairline grid ----------
   36 cells in five rows (8, 8, 8, 8, 4), the shape of VERA's test set. Illustrative only: the four
   marked cells are the cases named in this page's own copy, and the callouts name them. */
const ROWS = [8, 8, 8, 8, 4];
const TARGETS = new Set(['1-6', '2-1', '4-2', '5-4']);
// Decorative ink cells (illustration only, not results)
const INKED = new Set(['1-2', '1-3', '1-8', '2-4', '2-5', '2-7', '3-1', '3-3', '3-6', '3-7', '4-4', '4-5', '4-8', '5-2']);
let paused = reduced;
function fillLattice(el, withIndex) {
  let html = '', i = 0;
  ROWS.forEach((n, r) => { for (let c = 1; c <= n; c++) { const k = `${r + 1}-${c}`; html += `<i class="${TARGETS.has(k) ? 't' : INKED.has(k) ? 'f' : ''}" style="--i:${withIndex ? i : 0}"></i>`; i++; } });
  el.innerHTML = html;
}
/** Cursor-follow: cells near the pointer lift (--l); a ripple spreads from the pointer on entry and click. */
function reactive(grid) {
  if (!grid || reduced) return;
  const cells = [...grid.children];
  let raf = 0, px = 0, py = 0;
  const centres = () => cells.map((c) => { const r = c.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2, r.width]; });
  const lift = () => {
    raf = 0;
    if (paused) return;
    centres().forEach(([x, y, w], i) => { const d = Math.hypot(px - x, py - y); cells[i].style.setProperty('--l', Math.max(0, 1 - d / (w * 2.6)).toFixed(3)); });
  };
  const ripple = () => {
    if (paused) return;
    const near = [];
    centres().forEach(([x, y, w], i) => {
      const c = cells[i]; c.classList.remove('rip');
      const d = Math.hypot(px - x, py - y) / w;
      if (d <= 2.2) { c.style.setProperty('--rd', `${Math.round(d * 70)}ms`); near.push(c); }
    });
    void grid.offsetWidth;
    near.forEach((c) => c.classList.add('rip'));
  };
  const inside = (e) => { const r = grid.getBoundingClientRect(); return e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom; };
  const mouse = (e) => e.pointerType !== 'touch';
  let last = 0;
  grid.addEventListener('pointermove', (e) => {
    if (!mouse(e) || !inside(e)) return;
    px = e.clientX; py = e.clientY;
    if (!raf) raf = requestAnimationFrame(lift);
    const now = performance.now();
    if (now - last > 450) { last = now; ripple(); }
  });
  grid.addEventListener('pointerdown', (e) => { if (mouse(e) && inside(e)) { px = e.clientX; py = e.clientY; ripple(); } });
  grid.addEventListener('pointerleave', () => cells.forEach((c) => { c.style.setProperty('--l', 0); c.classList.remove('rip'); }));
}
const hl = $('#heroLattice');
if (hl) {
  fillLattice($('.hl-grid', hl), true);
  reactive($('.hl-grid', hl));
  setTimeout(() => hl.classList.add('on'), reduced ? 0 : 900);
}
/* ---------- Closing block: an illustrative run that scores 36 claims, then holds on a status ----------
   Illustrative only (labelled on the page): five fails out of 36 give 86.1%, which is in the
   70-90% review band. Codes shown are VERA's real rule codes. Plays only while in view and not paused. */
const loop = $('#closeLoop');
if (loop) {
  const FAILS = new Map([[4, 'coverage_limit_exceeded'], [11, 'missed_conflict'], [17, 'amount_not_supported_by_documents'], [26, 'followed_injected_instruction'], [31, 'pii_leaked_in_rationale']]);
  const cellsEl = $('#clpCells'), rateEl = $('#clpRate'), nEl = $('#clpN'), chipEl = $('#clpChip'), codesEl = $('#clpCodes');
  cellsEl.innerHTML = '<i></i>'.repeat(36);
  const cells = [...cellsEl.children];
  let k = 0, pass = 0, timer = 0, inView = false;
  const paint = () => { rateEl.textContent = `${k ? ((pass / k) * 100).toFixed(1) : '0.0'}%`; nEl.textContent = String(k); };
  const reset = () => { k = 0; pass = 0; cells.forEach((c) => (c.className = '')); codesEl.innerHTML = ''; loop.classList.remove('done'); paint(); };
  const step = () => {
    timer = 0;
    if (!inView || paused) return;
    if (k >= 36) { reset(); timer = setTimeout(step, 500); return; }
    const code = FAILS.get(k);
    cells[k].className = code ? 'x' : 'p';
    if (code) { const li = document.createElement('li'); li.textContent = code; codesEl.prepend(li); while (codesEl.children.length > 3) codesEl.lastElementChild.remove(); } else pass++;
    k++; paint();
    if (k === 36) { loop.classList.add('done'); timer = setTimeout(step, 2800); } else timer = setTimeout(step, 85);
  };
  const kickLoop = () => { if (!timer && inView && !paused) timer = setTimeout(step, 300); };
  if (reduced) { while (k < 36) { const code = FAILS.get(k); cells[k].className = code ? 'x' : 'p'; if (code) { const li = document.createElement('li'); li.textContent = code; codesEl.prepend(li); } else pass++; k++; } while (codesEl.children.length > 3) codesEl.lastElementChild.remove(); paint(); loop.classList.add('done'); }
  else {
    new IntersectionObserver(([en]) => { inView = en.isIntersecting; if (!inView && timer) { clearTimeout(timer); timer = 0; } kickLoop(); }, { threshold: 0.35 }).observe(loop);
    window.__veraLoopKick = kickLoop;
  }
}

/* ---------- Tint bands take their colour as they scroll into view ---------- */
const bandIO = new IntersectionObserver((es) => es.forEach((e) => e.target.classList.toggle('band-on', e.isIntersecting)), { rootMargin: '-25% 0px -25% 0px' });
$$('#checks, .how, .why, .build').forEach((el) => bandIO.observe(el));

/* ---------- First-visit intro: about 1.5s, once per session, skippable ---------- */
const intro = $('#intro');
let seen = true;
try { seen = sessionStorage.getItem('vera-intro') === '1'; sessionStorage.setItem('vera-intro', '1'); } catch (e) { seen = true; }
if (intro && !seen && !reduced) {
  fillLattice($('#introGrid'), true);
  intro.hidden = false;
  let done = false;
  const end = () => {
    if (done) return; done = true;
    intro.classList.add('out');
    setTimeout(() => { intro.hidden = true; }, 700);
    removeEventListener('keydown', end); removeEventListener('wheel', end);
  };
  intro.addEventListener('click', end);
  addEventListener('keydown', end, { once: true });
  addEventListener('wheel', end, { once: true, passive: true });
  setTimeout(end, 850);
}

/* ---------- Pause: stops the rule marquee ---------- */
const pauseBtn = $('#heroPause');
if (pauseBtn) {
  if (reduced) pauseBtn.hidden = true;
  pauseBtn.addEventListener('click', () => {
    paused = pauseBtn.getAttribute('aria-pressed') !== 'true';
    pauseBtn.setAttribute('aria-pressed', String(paused));
    pauseBtn.textContent = paused ? 'Play animation' : 'Pause animation';
    $('.marquee').classList.toggle('paused', paused);
    document.documentElement.classList.toggle('motion-paused', paused);
    if (window.__veraLoopKick) window.__veraLoopKick();
  });
}

onScroll();
