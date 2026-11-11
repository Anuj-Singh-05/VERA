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
  // Masks clip glyph overhang; remove them as soon as the words have risen.
  setTimeout(() => h1.classList.remove('split-ready'), 900 + $$('.w', h1).length * 55 + 100);
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
function fillLattice(el, withIndex) {
  let html = '', i = 0;
  ROWS.forEach((n, r) => { for (let c = 1; c <= n; c++) html += `<i class="${TARGETS.has(`${r + 1}-${c}`) ? 't' : ''}" style="--i:${withIndex ? i : 0}"></i>`, i++; });
  el.innerHTML = html;
}
const hl = $('#heroLattice');
if (hl) {
  fillLattice($('.hl-grid', hl), true);
  setTimeout(() => hl.classList.add('on'), reduced ? 0 : 900);
}

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
    const paused = pauseBtn.getAttribute('aria-pressed') !== 'true';
    pauseBtn.setAttribute('aria-pressed', String(paused));
    pauseBtn.textContent = paused ? 'Play animation' : 'Pause animation';
    $('.marquee').classList.toggle('paused', paused);
  });
}

onScroll();
