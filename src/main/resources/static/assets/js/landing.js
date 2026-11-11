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
  chart.innerHTML = `<div class="rc-legend"><span><i style="background:linear-gradient(90deg,#8a93a8,#c3cbec)"></i>${esc(d.baseline.label)}, run #${d.baseline.runs.join(', #')}</span><span><i style="background:linear-gradient(90deg,#2340ff,#6e7fff)"></i>${esc(d.calibrated.label)}, runs #${d.calibrated.runs.join(' and #')}</span><span>Marks at 70% and 90%</span></div>${rows}`;
  $('#caveats').innerHTML = d.caveats.map((c) => `<li>${esc(c)}</li>`).join('');
}).catch(() => { /* keep the noscript-style text already in the page */ });

/* ---------- Close section: spotlight follows the pointer; lattice wave when in view ---------- */
const close = $('#close');
if (close) {
  $$('.cl-row i', close).forEach((el, i) => el.style.setProperty('--i', i));
  new IntersectionObserver(([en]) => close.classList.toggle('in-view', en.isIntersecting), { threshold: 0.3 }).observe(close);
}
if (close && !reduced) {
  close.addEventListener('pointermove', (e) => {
    const r = close.getBoundingClientRect();
    close.style.setProperty('--mx', `${((e.clientX - r.left) / r.width) * 100}%`);
    close.style.setProperty('--my', `${((e.clientY - r.top) / r.height) * 100}%`);
  });
}

/* ---------- Hero: isometric case lattice on canvas ----------
   36 neutral blocks in five rows (8, 8, 8, 8, 4), the shape of VERA's test set. Illustrative only:
   no pass/fail colours, because nothing here is bound to a real run. Blocks drop in once, then
   rise under the pointer. Pauses off-screen, on request and under reduced motion. */
const canvas = $('#heroCanvas');
const pauseBtn = $('#heroPause');
if (canvas && canvas.getContext) {
  const ctx = canvas.getContext('2d');
  const ROWS = [8, 8, 8, 8, 4];
  const blocks = [];
  ROWS.forEach((n, r) => { for (let c = 0; c < n; c++) blocks.push({ r, c, h: 0, target: 1, born: (r * 8 + c) * 28 + 200, lift: 0 }); });
  let W = 0, H = 0, dpr = 1, unit = 30, ox = 0, oy = 0;
  let pointer = { x: -9999, y: -9999 };
  let paused = reduced, visible = true, t0 = performance.now(), raf = 0;

  const resize = () => {
    const rect = canvas.getBoundingClientRect();
    dpr = Math.min(2, devicePixelRatio || 1);
    W = rect.width; H = rect.height;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const wide = W > 1000;
    unit = wide ? Math.min(40, W / 36) : Math.min(28, W / 16);
    ox = wide ? W * 0.75 : W * 0.5;
    oy = wide ? H * 0.40 : H * 0.84;
  };
  const iso = (x, y, z) => ({ x: ox + (x - y) * unit * 0.866, y: oy + (x + y) * unit * 0.5 - z * unit });

  function drawBlock(b, now) {
    const age = now - t0 - b.born;
    const drop = reduced ? 1 : Math.min(1, Math.max(0, age / 700));
    const e = 1 - Math.pow(1 - drop, 3);
    if (e <= 0) return;
    const x = b.c * 1.18, y = b.r * 1.18;
    const base = 0.55;
    const top = iso(x + 0.5, y + 0.5, base + b.lift * 1.6);
    const d = Math.hypot(pointer.x - top.x, pointer.y - top.y);
    const want = d < unit * 3.2 ? (1 - d / (unit * 3.2)) : 0;
    b.lift += (want - b.lift) * 0.12;
    const z0 = (1 - e) * 6; // falls from above
    const zTop = base + b.lift * 1.6 + z0;
    const s = 0.92;
    const p = (dx, dy, z) => iso(x + dx * s, y + dy * s, z);
    const a = p(0, 0, zTop), bb = p(1, 0, zTop), c = p(1, 1, zTop), dd = p(0, 1, zTop);
    const b0 = p(1, 0, z0), c0 = p(1, 1, z0), d0 = p(0, 1, z0);
    const hl = b.lift;
    ctx.globalAlpha = e;
    // left face
    ctx.fillStyle = `rgb(${16 + hl * 20}, ${30 + hl * 30}, ${120 + hl * 60})`;
    ctx.beginPath(); ctx.moveTo(dd.x, dd.y); ctx.lineTo(c.x, c.y); ctx.lineTo(c0.x, c0.y); ctx.lineTo(d0.x, d0.y); ctx.closePath(); ctx.fill();
    // right face
    ctx.fillStyle = `rgb(${22 + hl * 30}, ${44 + hl * 40}, ${190 + hl * 40})`;
    ctx.beginPath(); ctx.moveTo(c.x, c.y); ctx.lineTo(bb.x, bb.y); ctx.lineTo(b0.x, b0.y); ctx.lineTo(c0.x, c0.y); ctx.closePath(); ctx.fill();
    // top face
    const g = ctx.createLinearGradient(a.x, a.y, c.x, c.y);
    g.addColorStop(0, `rgb(${70 + hl * 150}, ${100 + hl * 130}, 255)`);
    g.addColorStop(1, `rgb(${40 + hl * 120}, ${70 + hl * 120}, ${245})`);
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(bb.x, bb.y); ctx.lineTo(c.x, c.y); ctx.lineTo(dd.x, dd.y); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = `rgba(220, 227, 255, ${0.18 + hl * 0.5})`; ctx.lineWidth = 1; ctx.stroke();
    ctx.globalAlpha = 1;
  }

  function frame(now) {
    ctx.clearRect(0, 0, W, H);
    // floor grid under the lattice
    ctx.strokeStyle = 'rgba(110,127,255,0.10)'; ctx.lineWidth = 1;
    for (let i = -1; i <= 10; i++) { const a = iso(i * 1.18 - 0.1, -0.6, 0), b = iso(i * 1.18 - 0.1, 6.6, 0); ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); }
    for (let j = -1; j <= 6; j++) { const a = iso(-0.6, j * 1.18 - 0.1, 0), b = iso(10.2, j * 1.18 - 0.1, 0); ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); }
    blocks.slice().sort((p, q) => (p.r + p.c) - (q.r + q.c)).forEach((b) => drawBlock(b, now));
    const settled = now - t0 > 36 * 28 + 1200;
    const moving = blocks.some((b) => b.lift > 0.002) || pointer.x > -9000;
    if (!paused && visible && (!settled || moving)) raf = requestAnimationFrame(frame);
    else raf = 0;
  }
  const kick = () => { if (!raf && !paused && visible) raf = requestAnimationFrame(frame); };

  resize();
  addEventListener('resize', () => { resize(); if (!raf) frame(performance.now()); });
  const hero = canvas.parentElement;
  hero.addEventListener('pointermove', (e) => { const r = canvas.getBoundingClientRect(); pointer = { x: e.clientX - r.left, y: e.clientY - r.top }; kick(); });
  hero.addEventListener('pointerleave', () => { pointer = { x: -9999, y: -9999 }; kick(); });
  new IntersectionObserver(([en]) => { visible = en.isIntersecting; kick(); }).observe(hero);
  if (reduced) { frame(performance.now() + 99999); pauseBtn.hidden = true; }
  else kick();
  pauseBtn.addEventListener('click', () => {
    paused = !paused;
    pauseBtn.setAttribute('aria-pressed', String(paused));
    pauseBtn.textContent = paused ? 'Play animation' : 'Pause animation';
    $('.marquee').classList.toggle('paused', paused);
    if (paused) { blocks.forEach((b) => { b.lift = 0; }); frame(performance.now() + 99999); }
    kick();
  });
}

onScroll();
