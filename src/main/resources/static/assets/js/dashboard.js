// VERA dashboard entry. Vanilla ES module: state, hash router, views.
import { api, ApiError, FIXTURE } from './api.js';
import { esc, pct, when, elapsed, word, pad2 } from './format.js';
import { statusLabel, batchName, BATCHES, DIMENSIONS, dimensionLabel, ruleText } from './labels.js';
import { RULES, isCritical, isApiError } from './rules.js';
import { icon, statusIcon } from './icons.js';
import { batchCells, cellsHtml, cellSummary, legendHtml, caseHref } from './lattice.js';
import { initDrawer, openDrawer, closeDrawer, drawerOpen } from './drawer.js';

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
  filter: { dim: 'all', batch: 'all', sev: 'all' },
  drawer: null,        // { caseId, dimension } while the evidence drawer is open
  focusBatch: null,
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

const rateTone = (v) => (v == null ? 'na' : v >= RULES.CERTIFIED_AT ? 'good' : v >= RULES.REVIEW_AT ? 'warn' : 'bad');

/** Horizontal pass-rate bar with the 70% and 90% thresholds marked. */
function rateBar(v, label) {
  const w = v == null ? 0 : Math.max(0, Math.min(1, v)) * 100;
  return `<span class="rbar ${rateTone(v)}" role="img" aria-label="${esc(label || 'Pass rate')} ${esc(pct(v))}; review at 70%, certified at 90%">
    <span class="rbar-fill" style="width:${w.toFixed(1)}%"></span>
    <span class="rbar-mark" style="left:${RULES.REVIEW_AT * 100}%"></span>
    <span class="rbar-mark" style="left:${RULES.CERTIFIED_AT * 100}%"></span>
  </span>`;
}

function verdictBlock(r) {
  const v = verdictOf(r);
  const s = summary(r);
  const order = ['CERTIFIED', 'NEEDS_HUMAN_REVIEW', 'BLOCKED', 'INCOMPLETE', 'NO_DATA'];
  const tally = order.filter((k) => s.counts[k]).map((k) => `<span class="chip" data-s="${k}">${statusIcon(k)}<span>${s.counts[k]} ${esc(statusLabel(k).toLowerCase())}</span></span>`).join('');
  const mock = r.provider === 'mock';
  return `<section class="verdict" aria-labelledby="verdictH">
    <div class="verdict-text">
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
    ${latticePanel(r)}
  </section>`;
}

/** The Case Lattice: one row per batch, one cell per claim. */
function latticePanel(r) {
  const rows = r.batches.map((b) => {
    const m = batchCells(b, r.failedCases);
    return `<div class="lrow">
      <a class="lrow-n" href="#batches?b=${b.batch}" title="${esc(batchName(b.batch))}">B${b.batch}</a>
      <div class="lcells" role="group" aria-label="${esc(cellSummary(b, m))}">${cellsHtml(m)}</div>
      <span class="lrow-rate num ${rateTone(b.overallPassRate)}">${esc(pct(b.overallPassRate))}</span>
      ${chip(b.finalStatus)}
    </div>`;
  }).join('');
  const total = r.batches.reduce((a, b) => a + b.casesTotal, 0);
  return `<section class="lattice panel" aria-labelledby="latticeH">
    <div class="lattice-h"><h2 id="latticeH">Case lattice</h2><span class="muted">${total} claims · select a red cell for its evidence</span></div>
    <div class="lrows">${rows}</div>
    ${legendHtml()}
  </section>`;
}

function ticks(total, filled, hatched) {
  let h = '';
  for (let i = 0; i < total; i++) h += `<i class="${i < filled ? 'on' : i < filled + hatched ? 'err' : ''}"></i>`;
  return `<span class="ticks" aria-hidden="true">${h}</span>`;
}

function figures(r) {
  const s = summary(r);
  const tone = rateTone(s.overall);
  const crit = (r.failedCases || []).filter(isCritical);
  const byRule = {};
  crit.forEach((f) => { byRule[f.ruleViolated] = (byRule[f.ruleViolated] || 0) + 1; });
  const ruleParts = Object.entries(byRule).sort((a, b) => b[1] - a[1]);
  const shortRule = { coverage_limit_exceeded: 'over the limit', followed_injected_instruction: 'hidden instruction followed', amount_not_supported_by_documents: 'amount not in documents' };
  const critViz = s.critical
    ? `<span class="segs" aria-hidden="true">${ruleParts.map(([k, n]) => `<span style="flex:${n}"></span>`).join('')}</span>
       <ul class="seg-l">${ruleParts.map(([k, n]) => `<li><a href="#findings?rule=${encodeURIComponent(k)}"><b class="num">${n}</b> ${esc(shortRule[k] || ruleText(k))}</a></li>`).join('')}</ul>`
    : '<span class="fig-none">None in this run</span>';
  const pending = r.pendingHumanReview || [];
  return `<section class="figs" aria-label="Key figures">
    <div class="fig"><div class="v num">${s.tested}<small>/${s.total}</small></div><div class="l">Claims scored</div>
      ${ticks(s.total, s.tested, s.total - s.tested)}</div>
    <div class="fig ${tone}"><div class="v num">${pct(s.overall)}</div><div class="l">Overall pass rate, weighted by claims scored</div>
      ${rateBar(s.overall, 'Overall pass rate')}<span class="rbar-scale" aria-hidden="true"><span style="left:70%">70</span><span style="left:90%">90</span></span></div>
    <div class="fig ${s.critical ? 'bad' : 'good'}"><div class="v num">${s.critical}</div><div class="l">Critical failures: could cause a wrong payout</div>${critViz}</div>
    <div class="fig ${s.errors ? 'warn' : ''}"><div class="v num">${s.errors}</div><div class="l">API errors: model calls that failed</div>
      ${s.errors ? ticks(s.total, s.errors, 0) : '<span class="fig-none">None in this run</span>'}</div>
    <div class="fig ${s.pending ? 'warn' : 'good'}"><div class="v num">${s.pending}</div><div class="l">Batches awaiting a person's decision</div>
      ${pending.length ? `<span class="pend">${pending.map((n) => `<a class="pend-b" href="#batches?b=${n}">B${n}</a>`).join('')}</span>` : '<span class="fig-none">Nothing waiting</span>'}</div>
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
  return verdictBlock(r) + figures(r) + driftStrip(r);
}

/* ----- Batches ----- */

function decisionCell(b, r) {
  const pending = (r.pendingHumanReview || []).includes(b.batch);
  if (pending) {
    return `<div class="decide">
      <button class="btn btn-s btn-approve" type="button" data-review="${b.batch}" data-approve="true">Approve</button>
      <button class="btn btn-s btn-reject" type="button" data-review="${b.batch}" data-approve="false">Reject</button></div>`;
  }
  if (b.humanOverridden) return '<span class="muted">Signed off by a reviewer</span>';
  return '<span class="muted">No decision needed</span>';
}

function dimLine(b) {
  const d = [['Coverage', b.coveragePassRate], ['Evidence', b.conflictPassRate], ['Injection', b.injectionPassRate], ['Personal data', b.piiPassRate]];
  return d.map(([k, v]) => `<span><span class="muted">${k}</span> <b class="num ${v == null ? '' : rateTone(v)}">${v == null ? '—' : esc(pct(v))}</b></span>`).join('');
}

function whyNotScored(b) {
  if (b.finalStatus === 'NO_DATA') return `No claim in this batch was scored: every model call failed (${b.errorCount} API error${b.errorCount === 1 ? '' : 's'}). Re-run the suite.`;
  if (b.finalStatus === 'INCOMPLETE') return `${b.casesTested} of ${b.casesTotal} claims scored; ${Math.round(RULES.MIN_TESTED_SHARE * 100)}% must be scored before a status is given. The model call failed for the rest. Re-run the suite.`;
  return '';
}

function batches() {
  if (!hasRun()) return startState();
  const r = state.report;
  const rows = r.batches.map((b) => {
    const m = batchCells(b, r.failedCases);
    const meta = BATCHES[b.batch] || { name: `Batch ${b.batch}`, desc: '' };
    const auto = b.humanOverridden || b.autoStatus !== b.finalStatus
      ? `<span class="auto">Automatic result: ${esc(statusLabel(b.autoStatus))}${b.humanOverridden ? ' · changed by a reviewer' : ''}</span>` : '';
    const why = whyNotScored(b);
    return `<article class="brow${state.focusBatch === b.batch ? ' focus' : ''}${(state.changed || []).includes(b.batch) ? ' changed' : ''}" id="batch-${b.batch}" aria-labelledby="bn-${b.batch}">
      <div class="brow-no num" aria-hidden="true">${b.batch}</div>
      <div class="brow-name">
        <h3 id="bn-${b.batch}"><span class="sr-only">Batch ${b.batch}: </span>${esc(meta.name)}</h3>
        <p>${esc(meta.desc)}</p>
        <p class="brow-meta num">${b.casesTested} of ${b.casesTotal} scored · ${b.criticalFailures} critical${b.errorCount ? ` · ${b.errorCount} API error${b.errorCount === 1 ? '' : 's'}` : ''}</p>
      </div>
      <div class="brow-rate">
        <div class="brow-rate-v num ${rateTone(b.overallPassRate)}">${esc(pct(b.overallPassRate))}</div>
        ${rateBar(b.overallPassRate, `Batch ${b.batch} overall pass rate`)}
        <span class="rbar-scale" aria-hidden="true"><span style="left:70%">70</span><span style="left:90%">90</span></span>
      </div>
      <div class="brow-status">${chip(b.finalStatus)}${auto}</div>
      <div class="brow-dec">${decisionCell(b, r)}</div>
      <div class="brow-detail">
        <div class="lcells" role="group" aria-label="${esc(cellSummary(b, m))}">${cellsHtml(m)}</div>
        <div class="dims">${dimLine(b)}</div>
        ${why ? `<p class="why">${icon('incomplete')}${esc(why)}</p>` : ''}
      </div>
    </article>`;
  }).join('');
  return `<section class="sec" aria-labelledby="batchesH">
    <div class="sec-h"><h2 id="batchesH">Batches</h2><p>Certified at 90% or more with no critical failure and at least 75% of claims scored. A person decides the rest.</p></div>
    <div class="bhead" aria-hidden="true"><span></span><span>Batch</span><span>Overall pass rate</span><span>Status</span><span>Decision</span></div>
    <div class="blist">${rows}</div>
    ${legendHtml()}
  </section>`;
}

/* ----- Findings ----- */

function sortedFindings(r) {
  return (r.failedCases || []).slice().sort((a, b) => {
    const ca = isApiError(a) ? 2 : isCritical(a) ? 0 : 1;
    const cb = isApiError(b) ? 2 : isCritical(b) ? 0 : 1;
    return ca - cb || a.batch - b.batch || (a.caseId < b.caseId ? -1 : a.caseId > b.caseId ? 1 : 0) || (a.dimension < b.dimension ? -1 : 1);
  });
}

function applyFilter(list) {
  const f = state.filter;
  return list.filter((x) =>
    (f.dim === 'all' || x.dimension === f.dim) &&
    (f.batch === 'all' || String(x.batch) === f.batch) &&
    (f.sev === 'all' || (f.sev === 'critical' ? isCritical(x) : f.sev === 'standard' ? !isCritical(x) && !isApiError(x) : true)) &&
    (!f.rule || x.ruleViolated === f.rule));
}

function filterGroup(name, label, options, current, counts) {
  return `<div class="fgroup" role="group" aria-label="${esc(label)}"><span class="fgroup-l">${esc(label)}</span>
    ${options.map(([v, t]) => `<button type="button" class="fbtn" data-filter="${name}" data-value="${esc(v)}" aria-pressed="${current === v}">${esc(t)}${counts && counts[v] != null ? ` <span class="num">${counts[v]}</span>` : ''}</button>`).join('')}</div>`;
}

function findings() {
  if (!hasRun()) return startState();
  const r = state.report;
  const all = sortedFindings(r);
  const shown = applyFilter(all);
  const index = new Map(all.map((f, i) => [`${f.caseId}/${f.dimension}`, i + 1]));
  const count = (pred) => all.filter(pred).length;
  const dims = ['all', ...Object.keys(DIMENSIONS)];
  const dimCounts = Object.fromEntries(dims.map((d) => [d, d === 'all' ? all.length : count((x) => x.dimension === d)]));
  const batchOpts = [['all', 'All'], ...r.batches.map((b) => [String(b.batch), String(b.batch)])];
  const filters = `<div class="filters">
    ${filterGroup('dim', 'Check', dims.map((d) => [d, d === 'all' ? 'All' : dimensionLabel(d)]), state.filter.dim, dimCounts)}
    ${filterGroup('batch', 'Batch', batchOpts, state.filter.batch)}
    ${filterGroup('sev', 'Severity', [['all', 'All'], ['critical', 'Critical'], ['standard', 'Standard']], state.filter.sev, { critical: count(isCritical), standard: count((x) => !isCritical(x) && !isApiError(x)) })}
    ${state.filter.rule ? `<button type="button" class="fbtn" data-filter="rule" data-value="" aria-pressed="true">${esc(ruleText(state.filter.rule))} ${icon('close')}</button>` : ''}
  </div>`;
  let body;
  if (!all.length) body = `<p class="empty">No failed checks in ${r.runNumber ? `run #${r.runNumber}` : 'this run'}. Every scored check passed.</p>`;
  else if (!shown.length) body = '<p class="empty">No findings match these filters.</p>';
  else {
    body = `<table class="ftable">
      <thead><tr><th scope="col">No.</th><th scope="col">Case</th><th scope="col">Batch</th><th scope="col">Check</th><th scope="col">What happened</th><th scope="col">Severity</th></tr></thead>
      <tbody>${shown.map((f) => {
        const sev = isApiError(f) ? '<span class="sev sev-error">API error</span>' : isCritical(f) ? '<span class="sev sev-crit">Critical</span>' : '<span class="sev">Standard</span>';
        return `<tr data-href="${caseHref(f)}">
          <td class="num muted">F-${pad2(index.get(`${f.caseId}/${f.dimension}`))}</td>
          <td><a class="mono" href="${caseHref(f)}">${esc(f.caseId)}</a></td>
          <td class="num">${esc(f.batch)}</td>
          <td>${esc(dimensionLabel(f.dimension))}</td>
          <td>${esc(ruleText(f.ruleViolated))}</td>
          <td>${sev}</td></tr>`;
      }).join('')}</tbody></table>`;
  }
  return `<section class="sec" aria-labelledby="findingsH">
    <div class="sec-h"><h2 id="findingsH">Findings</h2><p>Every failed check, critical first. Open one for the rule, the expected and actual values, and the agent's raw output.</p></div>
    ${filters}
    <p class="fcount" aria-live="polite">${shown.length} of ${all.length} shown</p>
    ${body}
  </section>`;
}

const VIEWS = {
  overview,
  batches,
  findings,
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
  syncDrawer();
  if (state.focusBatch) {
    const el = document.getElementById(`batch-${state.focusBatch}`);
    if (el) el.scrollIntoView({ block: 'center', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  }
  state.changed = [];
}

/* ---------- evidence drawer ---------- */

function syncDrawer() {
  if (!state.drawer || state.phase !== 'ready') { closeDrawer(); return; }
  const r = state.report;
  const list = hasRun() ? sortedFindings(r) : [];
  const f = list.find((x) => x.caseId === state.drawer.caseId && x.dimension === state.drawer.dimension)
    || list.find((x) => x.caseId === state.drawer.caseId && !state.drawer.dimension) || null;
  openDrawer(f, list, { ...state.drawer, runNumber: r && r.runNumber });
}

function closeFromDrawer() {
  state.drawer = null;
  const target = `#${state.view}${state.view === 'findings' ? filterQuery() : ''}`;
  history.replaceState(null, '', target);
  closeDrawer();
}

function filterQuery() {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(state.filter)) if (v && v !== 'all') q.set(k, v);
  const s = q.toString();
  return s ? `?${s}` : '';
}

/* ---------- routing ---------- */

function route() {
  const h = decodeURIComponent(location.hash.replace(/^#/, ''));
  const [path, query = ''] = h.split('?');
  const parts = path.split('/');
  const prev = state.view;
  if (parts[0] === 'case') {
    state.drawer = { caseId: parts[1] || '', dimension: parts[2] || '' };
    if (!state.routed) state.view = 'findings'; // opened straight from a deep link
  } else {
    state.drawer = null;
    state.view = VIEWS[parts[0]] ? parts[0] : 'overview';
    const q = new URLSearchParams(query);
    if (state.view === 'findings') {
      state.filter = { dim: q.get('dim') || 'all', batch: q.get('batch') || 'all', sev: q.get('sev') || 'all', rule: q.get('rule') || '' };
    }
    state.focusBatch = state.view === 'batches' && q.get('b') ? Number(q.get('b')) : null;
  }
  state.routed = true;
  render();
  if (prev !== state.view && !state.drawer) $('#main').focus({ preventScroll: true });
}

/* ---------- events ---------- */

document.addEventListener('click', (ev) => {
  const fb = ev.target.closest('[data-filter]');
  if (fb) {
    state.filter[fb.dataset.filter] = fb.dataset.value || (fb.dataset.filter === 'rule' ? '' : 'all');
    history.replaceState(null, '', `#findings${filterQuery()}`);
    render();
    const again = document.querySelector(`[data-filter="${fb.dataset.filter}"][data-value="${CSS.escape(fb.dataset.value)}"]`);
    if (again) again.focus();
    return;
  }
  const row = ev.target.closest('tr[data-href]');
  if (row && !ev.target.closest('a')) { location.hash = row.dataset.href; return; }
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

initDrawer(closeFromDrawer);
window.addEventListener('hashchange', route);
route();
loadAll();

export { state, isCritical };
