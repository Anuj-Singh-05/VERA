// VERA dashboard entry. Vanilla ES module: state, hash router, views.
import { api, ApiError, FIXTURE } from './api.js';
import { esc, pct, when, elapsed, word } from './format.js';
import { statusLabel } from './labels.js';
import { isCritical, isApiError } from './rules.js';
import { icon, statusIcon } from './icons.js';

const $ = (s, root = document) => root.querySelector(s);

const state = {
  phase: 'loading',   // loading | ready | unreachable
  report: null,
  runs: [],
  log: [],
  running: false,
  runStarted: 0,
  runError: null,
  showAllDrift: false,
  view: 'overview',
};

/* ---------- small helpers ---------- */

export function chip(status, size = '') {
  return `<span class="chip ${size}" data-s="${esc(status)}">${statusIcon(status)}<span>${esc(statusLabel(status))}</span></span>`;
}

function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => t.classList.remove('show'), 4200);
}

const hasRun = () => !!(state.report && state.report.batches && state.report.batches.length);

function summary(r) {
  const s = { tested: 0, total: 0, critical: 0, errors: 0, weighted: 0, counts: {} };
  for (const b of r.batches) {
    s.tested += b.casesTested;
    s.total += b.casesTotal;
    s.critical += b.criticalFailures;
    s.errors += b.errorCount;
    s.weighted += b.overallPassRate * b.casesTested;
    s.counts[b.finalStatus] = (s.counts[b.finalStatus] || 0) + 1;
  }
  s.overall = s.tested ? s.weighted / s.tested : null;
  s.pending = (r.pendingHumanReview || []).length;
  s.findings = (r.failedCases || []).filter((f) => !isApiError(f)).length;
  return s;
}

/** One plain sentence for the run, and the run-level status it implies. */
function verdictOf(r) {
  const n = r.batches.length;
  const c = summary(r).counts;
  const cert = c.CERTIFIED || 0;
  if (cert === n) return { status: 'CERTIFIED', text: `All ${word(n).toLowerCase()} batches are certified for this run.` };
  const parts = [];
  const w = (k) => word(k).toLowerCase();
  if (c.BLOCKED) parts.push(`${w(c.BLOCKED)} blocked`);
  if (c.NEEDS_HUMAN_REVIEW) parts.push(`${w(c.NEEDS_HUMAN_REVIEW)} waiting for a human decision`);
  if (c.INCOMPLETE) parts.push(`${w(c.INCOMPLETE)} incomplete`);
  if (c.NO_DATA) parts.push(`${w(c.NO_DATA)} with no data`);
  const head = cert ? `${word(cert)} of ${word(n).toLowerCase()} batches certified.` : 'No batch is certified.';
  const tail = parts.join(', ');
  const status = c.BLOCKED ? 'BLOCKED' : (c.INCOMPLETE || c.NO_DATA ? 'INCOMPLETE' : 'NEEDS_HUMAN_REVIEW');
  return { status, text: `${head} ${tail.charAt(0).toUpperCase()}${tail.slice(1)}.` };
}

/* ---------- data ---------- */

async function loadAll() {
  try {
    const report = await api.report();
    const [runs, log] = await Promise.all([
      api.runs().catch(() => state.runs),
      api.reviewLog().catch(() => state.log),
    ]);
    Object.assign(state, { report, runs: runs || [], log: log || [], phase: 'ready' });
  } catch (e) {
    state.phase = 'unreachable';
    state.loadError = e;
  }
  render();
}

async function runSuite() {
  if (state.running) return;
  const before = state.report;
  state.running = true;
  state.runStarted = Date.now();
  state.runError = null;
  setRunning(true);
  render();
  try {
    const report = await api.run();
    state.report = report;
    const [runs, log] = await Promise.all([api.runs().catch(() => state.runs), api.reviewLog().catch(() => state.log)]);
    state.runs = runs || [];
    state.log = log || [];
    state.phase = 'ready';
    state.changed = changedBatches(before, report);
    const n = state.changed.length;
    toast(`Run #${report.runNumber || ''} complete. ${n ? `${word(n)} batch${n === 1 ? '' : 'es'} changed status.` : 'No batch changed status.'}`);
  } catch (e) {
    state.runError = e instanceof ApiError && e.kind === 'unreachable'
      ? 'The run did not finish because the VERA service stopped answering. Your previous report is unchanged.'
      : `The run did not finish (${e.message}). Your previous report is unchanged.`;
  } finally {
    state.running = false;
    setRunning(false);
    render();
  }
}

/** Batches whose status differs from the previous report, or from the previous saved run. */
function changedBatches(before, after) {
  let prevBatches = before && before.batches && before.batches.length ? before.batches : null;
  if (!prevBatches) {
    const earlier = state.runs.filter((r) => r.runNumber !== after.runNumber);
    prevBatches = earlier.length ? earlier[earlier.length - 1].batches : null;
  }
  if (!prevBatches) return [];
  const prev = new Map(prevBatches.map((b) => [b.batch, b.finalStatus || b.autoStatus]));
  return after.batches.filter((b) => prev.has(b.batch) && prev.get(b.batch) !== b.finalStatus).map((b) => b.batch);
}

/* ---------- shell ---------- */

function setRunning(on) {
  const btn = $('#runBtn');
  clearInterval(setRunning.timer);
  $('#runbar').hidden = !on;
  if (on) {
    btn.setAttribute('aria-busy', 'true');
    const tick = () => { btn.querySelector('.run-label').textContent = `Running · ${elapsed(Date.now() - state.runStarted)}`; };
    tick();
    setRunning.timer = setInterval(tick, 1000);
  } else {
    btn.removeAttribute('aria-busy');
    btn.querySelector('.run-label').textContent = 'Run assurance suite';
  }
}

function renderShell() {
  const r = state.report;
  const mock = r && r.provider === 'mock';
  $('#simBanner').hidden = !(mock && state.phase === 'ready');
  $('#fixtureBanner').hidden = !FIXTURE;
  const agent = $('#agentChip');
  if (r && state.phase === 'ready') {
    agent.hidden = false;
    agent.textContent = mock ? 'mock · scripted' : `${r.provider} · ${r.model}${r.promptVersion && r.promptVersion !== 'n/a' ? ` · ${r.promptVersion}` : ''}`;
    agent.title = `Agent under test: ${r.provider}, model ${r.model}, prompt ${r.promptVersion}`;
  } else agent.hidden = true;

  const s = hasRun() ? summary(r) : null;
  const setCount = (k, v, attn) => {
    const el = $(`[data-count="${k}"]`);
    el.textContent = v ? String(v) : '';
    el.classList.toggle('attn', !!attn);
  };
  setCount('findings', s ? s.findings : 0);
  setCount('runs', state.runs.length);
  setCount('reviews', s ? s.pending : 0, true);
  document.querySelectorAll('.views a').forEach((a) => {
    if (a.dataset.view === state.view) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });
}

/* ---------- notices ---------- */

function noticeHtml() {
  if (state.running) {
    return `<div class="notice notice-run" role="status">${icon('play')}<div><h2>Running 36 claims through the agent</h2>
      <p>A mock run takes a few seconds. A live run takes about 4 to 5 minutes and cannot be cancelled. Keep this tab open.</p></div></div>`;
  }
  if (state.runError) {
    return `<div class="notice notice-error" role="alert">${icon('alert')}<div><h2>The run did not finish</h2><p>${esc(state.runError)}</p></div>
      <div class="actions"><button class="btn btn-s" type="button" data-act="retry-run">${icon('retry')}Try the run again</button></div></div>`;
  }
  return '';
}

/* ---------- views ---------- */

function skeleton() {
  return `<div aria-busy="true" aria-label="Loading the latest report">
    <div class="sk sk-verdict"></div><div class="sk sk-line"></div><div class="sk sk-figs"></div></div>`;
}

function unreachable() {
  return `<div class="notice notice-error" role="alert" style="margin-top:48px">${icon('alert')}<div>
    <h2>VERA can't reach its service at this address</h2>
    <p>The dashboard needs the VERA server running on this machine. Start it with <code class="mono">mvn spring-boot:run</code> in the project folder, then try again.</p></div>
    <div class="actions"><button class="btn btn-s" type="button" data-act="reload">${icon('retry')}Try again</button></div></div>`;
}

function startState() {
  const last = state.runs.length ? state.runs[state.runs.length - 1] : null;
  return `<section class="start" aria-labelledby="startH">
    <div>
      <h1 id="startH">No run in this server session yet.</h1>
      <p>Run the suite to send 36 synthetic claims through the agent and apply four checks: coverage limit, evidence grounding, prompt injection and personal data.${last ? ` The last saved run is #${last.runNumber}, ${esc(when(last.timestamp))}.` : ''}</p>
      <button class="btn btn-primary" type="button" data-act="run" ${state.running ? 'disabled' : ''}>${icon('play')}Run assurance suite</button>
    </div>
    <div class="start-facts">
      <div><b>36</b><span>synthetic claims in five batches</span></div>
      <div><b>4</b><span>numeric checks on every reply</span></div>
      <div><b>90%</b><span>to certify a batch, with no critical failure</span></div>
      <div><b>${state.runs.length}</b><span>run${state.runs.length === 1 ? '' : 's'} saved in history</span></div>
    </div>
  </section>`;
}

function verdictBlock(r) {
  const v = verdictOf(r);
  const s = summary(r);
  const order = ['CERTIFIED', 'NEEDS_HUMAN_REVIEW', 'BLOCKED', 'INCOMPLETE', 'NO_DATA'];
  const tally = order.filter((k) => s.counts[k]).map((k) => `<span class="chip" data-s="${k}">${statusIcon(k)}<span>${s.counts[k]} ${esc(statusLabel(k).toLowerCase())}</span></span>`).join('');
  const mock = r.provider === 'mock';
  return `<section class="verdict" aria-labelledby="verdictH">
    <div>
      ${chip(v.status, 'chip-l')}
      <h1 id="verdictH">${esc(v.text)}</h1>
      <div class="tally" aria-label="Batches by status">${tally}</div>
      <div class="meta">
        ${r.runNumber ? `<span>Run <b>#${r.runNumber}</b></span>` : ''}
        <span>Agent <b>${esc(mock ? 'mock (scripted)' : r.provider)}</b></span>
        <span>Model <b>${esc(r.model)}</b></span>
        ${mock ? '' : `<span>Prompt <b>${esc(r.promptVersion)}</b></span>`}
        ${r.timestamp ? `<span>Issued <b>${esc(when(r.timestamp))}</b></span>` : ''}
      </div>
    </div>
  </section>`;
}

function figures(r) {
  const s = summary(r);
  const tone = s.overall == null ? '' : s.overall >= 0.9 ? 'good' : s.overall >= 0.7 ? 'warn' : 'bad';
  return `<section class="figs" aria-label="Key figures">
    <div class="fig"><div class="v num">${s.tested}<small>/${s.total}</small></div><div class="l">Claims scored</div><div class="h">API errors are not scored</div></div>
    <div class="fig ${tone}"><div class="v num">${pct(s.overall)}</div><div class="l">Overall pass rate</div><div class="h">weighted by claims scored</div></div>
    <div class="fig ${s.critical ? 'bad' : 'good'}"><div class="v num">${s.critical}</div><div class="l">Critical failures</div><div class="h">could cause a wrong payout</div></div>
    <div class="fig ${s.errors ? 'warn' : ''}"><div class="v num">${s.errors}</div><div class="l">API errors</div><div class="h">model calls that failed</div></div>
    <div class="fig ${s.pending ? 'warn' : 'good'}"><div class="v num">${s.pending}</div><div class="l">Awaiting a decision</div><div class="h">batches a person must sign off</div></div>
  </section>`;
}

function driftStrip(r) {
  const alerts = r.driftAlerts || [];
  if (!alerts.length) return '';
  const shown = state.showAllDrift ? alerts : alerts.slice(0, 2);
  const prev = (alerts[0].match(/run #(\d+)/) || [])[1];
  return `<section class="drift" role="alert" aria-labelledby="driftH">
    ${icon('alert')}
    <div>
      <h2 id="driftH">${alerts.length} drift alert${alerts.length === 1 ? '' : 's'}: worse than run #${esc(prev || '?')} with the same agent, model and prompt</h2>
      <ul>${shown.map((a) => `<li>${esc(a)}</li>`).join('')}</ul>
      ${alerts.length > 2 && !state.showAllDrift ? `<p class="note">${alerts.length - 2} more.</p>` : ''}
    </div>
    ${alerts.length > 2 ? `<button class="btn btn-s" type="button" data-act="toggle-drift" aria-expanded="${state.showAllDrift}">${state.showAllDrift ? 'Show fewer' : `Show all ${alerts.length}`}</button>` : ''}
  </section>`;
}

function overview() {
  if (!hasRun()) return startState();
  const r = state.report;
  return verdictBlock(r) + figures(r) + driftStrip(r) +
    `<div class="later"></div>`;
}

const VIEWS = {
  overview,
  batches: () => (hasRun() ? '' : startState()),
  findings: () => (hasRun() ? '' : startState()),
  runs: () => '',
  reviews: () => '',
};

function render() {
  renderShell();
  $('#notice').innerHTML = state.phase === 'ready' ? noticeHtml() : '';
  let html;
  if (state.phase === 'loading') html = skeleton();
  else if (state.phase === 'unreachable') html = unreachable();
  else html = (VIEWS[state.view] || overview)();
  $('#view').innerHTML = html;
  state.changed = [];
}

/* ---------- routing ---------- */

function route() {
  const h = location.hash.replace(/^#/, '');
  const name = h.split(/[/?]/)[0] || 'overview';
  const prev = state.view;
  state.view = VIEWS[name] ? name : 'overview';
  render();
  if (prev !== state.view) $('#main').focus({ preventScroll: true });
}

/* ---------- events ---------- */

document.addEventListener('click', (ev) => {
  const a = ev.target.closest('[data-act]');
  if (!a) return;
  const act = a.dataset.act;
  if (act === 'run' || act === 'retry-run') runSuite();
  else if (act === 'reload') { state.phase = 'loading'; render(); loadAll(); }
  else if (act === 'toggle-drift') { state.showAllDrift = !state.showAllDrift; render(); }
});
$('#runBtn').addEventListener('click', runSuite);
$('#printBtn').innerHTML = icon('print');
$('#printBtn').addEventListener('click', () => window.print());

function applyThemeButton() {
  const dark = document.documentElement.getAttribute('data-theme') === 'dark';
  const b = $('#themeBtn');
  b.innerHTML = icon(dark ? 'sun' : 'moon');
  b.setAttribute('aria-label', dark ? 'Switch to light theme' : 'Switch to dark theme');
}
$('#themeBtn').addEventListener('click', () => {
  const dark = document.documentElement.getAttribute('data-theme') === 'dark';
  if (dark) document.documentElement.removeAttribute('data-theme');
  else document.documentElement.setAttribute('data-theme', 'dark');
  try { localStorage.setItem('vera-theme', dark ? 'light' : 'dark'); } catch (e) { /* storage blocked */ }
  applyThemeButton();
});
applyThemeButton();

window.addEventListener('hashchange', route);
route();
loadAll();

export { state, isCritical };
