// VERA dashboard entry. Vanilla ES module: state, hash router, views. No framework, no build step.
import { api, ApiError, FIXTURE } from './api.js';
import { esc, pct, when, elapsed, word, pad2 } from './format.js';
import { statusLabel, batchName, BATCHES, DIMENSIONS, dimensionLabel, ruleText } from './labels.js';
import { RULES, isCritical, isApiError } from './rules.js';
import { icon, statusIcon } from './icons.js';
import { batchCells, cellsHtml, cellSummary, legendHtml, caseHref, miniLattice } from './lattice.js';
import { initDrawer, openDrawer, closeDrawer, setReturnKey } from './drawer.js';
import { verdictOf, pendingBatches, isPending, consistencyProblems } from './verdict.js';
import { openReview } from './review.js';
import { runsView, runOverall, previousComparable } from './runs.js';

const $ = (s, root = document) => root.querySelector(s);
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

const state = {
  phase: 'loading',     // loading | ready | unreachable
  report: null,
  runs: [],
  log: [],
  running: false,
  runStarted: 0,
  runError: null,
  showAllDrift: false,
  view: 'overview',
  filter: { dim: 'all', batch: 'all', sev: 'all', rule: '' },
  drawer: null,         // { caseId, dimension } while the evidence drawer is open
  focusBatch: null,
  openRun: null,
  changed: [],          // batches whose status just changed (animated once)
  animatedRun: null,    // run number whose entrance animation already played
  routed: false,
};

/* ---------- helpers ---------- */

export function chip(status, size = '', extra = '') {
  return `<span class="chip ${size} ${extra}" data-s="${esc(status)}">${statusIcon(status)}<span>${esc(statusLabel(status))}</span></span>`;
}

function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => t.classList.remove('show'), 4600);
}

const hasRun = () => !!(state.report && state.report.batches && state.report.batches.length);
const rateTone = (v) => (v == null ? 'na' : v >= RULES.CERTIFIED_AT ? 'good' : v >= RULES.REVIEW_AT ? 'warn' : 'bad');

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
  s.pendingList = pendingBatches(r); // the one definition (verdict.js)
  s.pending = s.pendingList.length;
  s.findings = (r.failedCases || []).filter((f) => !isApiError(f)).length;
  return s;
}

/* ---------- data ---------- */

async function loadAll() {
  try {
    const report = await api.report();
    const [runs, log] = await Promise.all([api.runs().catch(() => state.runs), api.reviewLog().catch(() => state.log)]);
    Object.assign(state, { report, runs: runs || [], log: log || [], phase: 'ready' });
  } catch (e) {
    state.phase = 'unreachable';
  }
  render();
}

async function refreshAfterReview() {
  const report = await api.report();
  const log = await api.reviewLog().catch(() => state.log);
  state.report = report;
  state.log = log || [];
}

async function runSuite() {
  if (state.running || state.phase === 'unreachable') return;
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
    toast(`Run #${report.runNumber || ''} complete. ${n ? `${word(n)} batch${n === 1 ? '' : 'es'} changed status since the previous run.` : 'No batch changed status since the previous run.'}`);
  } catch (e) {
    state.runError = e instanceof ApiError && e.kind === 'unreachable'
      ? 'The VERA service stopped answering before the run finished. Your previous report is unchanged.'
      : `The service reported a problem (${e.message}). Your previous report is unchanged.`;
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

async function review(batchNo, approve, opener) {
  const b = state.report && state.report.batches.find((x) => x.batch === batchNo);
  if (!b || !isPending(state.report, batchNo) || state.running) return;
  const saved = await openReview(b, approve, async (name, note) => {
    await api.review(batchNo, approve, name, note);
    await refreshAfterReview();
  });
  if (saved) {
    state.changed = [batchNo];
    render();
    toast(`Batch ${batchNo} ${approve ? 'approved: now Certified' : 'rejected: now Blocked'} for run #${state.report.runNumber}. The decision is in the review log.`);
    const again = document.querySelector(`#batch-${batchNo} .b-status, [data-pend="${batchNo}"]`);
    (again || $('#main')).focus?.({ preventScroll: false });
  } else if (opener && document.contains(opener)) opener.focus();
}

/* ---------- shell ---------- */

function setRunning(on) {
  const btn = $('#runBtn');
  clearInterval(setRunning.timer);
  $('#runbar').hidden = !on;
  document.body.classList.toggle('is-running', on);
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
    agent.textContent = mock ? 'mock agent · simulated' : `${r.provider} · ${r.model}${r.promptVersion && r.promptVersion !== 'n/a' ? ` · ${r.promptVersion}` : ''}`;
    agent.title = `Agent under test: ${r.provider}, model ${r.model}, prompt ${r.promptVersion}`;
  } else agent.hidden = true;

  const s = hasRun() ? summary(r) : null;
  const setCount = (k, v, attn, label) => {
    const el = $(`[data-count="${k}"]`);
    el.textContent = v ? String(v) : '';
    el.classList.toggle('attn', !!attn);
    const link = el.closest('a');
    const name = link.firstChild.textContent.trim();
    link.setAttribute('aria-label', v ? `${name}, ${v} ${label}` : name);
  };
  setCount('findings', s ? s.findings : 0, false, 'failed checks');
  setCount('runs', state.runs.length, false, 'saved runs');
  setCount('reviews', s ? s.pending : 0, true, 'waiting for a decision');
  document.querySelectorAll('.views a').forEach((a) => {
    if (a.dataset.view === state.view) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });
  const runBtn = $('#runBtn');
  runBtn.disabled = state.phase === 'unreachable' || (state.phase === 'loading' && !state.running);
  runBtn.title = state.phase === 'unreachable' ? 'The VERA service is not reachable' : 'Send 36 synthetic claims through the agent and score them';
}

/* ---------- shared pieces ---------- */

function noticeHtml() {
  if (state.running) {
    return `<div class="notice notice-run" role="status">${icon('play')}<div><h2>Running 36 claims through the agent</h2>
      <p>A mock run takes a few seconds. A live run takes about 4 to 5 minutes and cannot be cancelled. Keep this tab open; the elapsed time is on the Run button.</p></div></div>`;
  }
  if (state.runError) {
    return `<div class="notice notice-error" role="alert">${icon('alert')}<div><h2>The run did not finish</h2><p>${esc(state.runError)}</p></div>
      <div class="actions"><button class="btn btn-s" type="button" data-act="retry-run">${icon('retry')}Try the run again</button></div></div>`;
  }
  return '';
}

function rateBar(v, label) {
  const w = v == null ? 0 : Math.max(0, Math.min(1, v)) * 100;
  return `<span class="rbar ${rateTone(v)}" role="img" aria-label="${esc(label || 'Pass rate')} ${esc(pct(v))}; review from 70%, certified from 90%">
    <span class="rbar-fill" style="--w:${w.toFixed(1)}%"></span>
    <span class="rbar-mark" style="left:${RULES.REVIEW_AT * 100}%"></span>
    <span class="rbar-mark" style="left:${RULES.CERTIFIED_AT * 100}%"></span>
  </span><span class="rbar-scale" aria-hidden="true"><span style="left:70%">70</span><span style="left:90%">90</span></span>`;
}

/** Slim page header for working views: title, one line, optional side actions and filters. */
function phead(title, line, side = '', filters = '') {
  return `<div class="wrap"><header class="phead">
    <div><h1>${esc(title)}</h1><p>${line}</p></div>
    ${side ? `<div class="ph-side">${side}</div>` : ''}
    ${filters ? `<div class="ph-filters">${filters}</div>` : ''}
  </header></div>`;
}

/** Empty state: a ghost lattice row, one sentence of what is missing, one action. */
function emptyState(title, line, action = '') {
  return `<div class="empty-state" role="status">
    <span class="ghost" aria-hidden="true">${'<i></i>'.repeat(8)}</span>
    <div><h3>${esc(title)}</h3><p>${line}</p>${action}</div></div>`;
}

const runAction = () => `<button class="btn btn-primary" type="button" data-act="run" ${state.running || state.phase !== 'ready' ? 'disabled' : ''}>${icon('play')}Run assurance suite</button>`;

function consistencyNotice(r) {
  const problems = consistencyProblems(r);
  if (!problems.length) return '';
  console.error('VERA report consistency problems:', problems);
  return `<div class="notice notice-error" role="alert">${icon('alert')}<div><h2>The report contradicts itself</h2>
    <p>${problems.map(esc).join(' ')} The Approve/Reject buttons follow the server's list.</p></div></div>`;
}

/* ---------- views ---------- */

function skeleton() {
  return `<section class="verdict-band" aria-busy="true" aria-label="Loading the latest report"><div class="wrap verdict">
    <div><div class="sk sk-chip"></div><div class="sk sk-verdict"></div><div class="sk sk-verdict short"></div><div class="sk sk-line"></div></div>
    <div class="sk sk-lattice"></div></div></section>
    <div class="wrap"><div class="sk sk-figs"></div></div>`;
}

function unreachable() {
  return `<div class="wrap"><div class="notice notice-error big" role="alert">${icon('alert')}<div>
    <h2>VERA can't reach its service at this address</h2>
    <p>The dashboard needs the VERA server running on this machine. Start it from the project folder, then try again:</p>
    <pre class="cmd">$env:VERA_HISTORY_DIR="$env:TEMP\\vera-test"; mvn spring-boot:run</pre></div>
    <div class="actions"><button class="btn btn-primary btn-s" type="button" data-act="reload">${icon('retry')}Try again</button></div></div></div>`;
}

function neutralLattice() {
  const rows = [8, 8, 8, 8, 4].map((n, i) => `<div class="lrow"><span class="lrow-n">B${i + 1}</span><div class="lcells">${'<span class="cell c-idle"></span>'.repeat(n)}</div></div>`).join('');
  return `<div class="lattice panel idle" aria-hidden="true"><div class="lrows">${rows}</div></div>`;
}

function startState() {
  const last = state.runs.length ? state.runs[state.runs.length - 1] : null;
  return `<section class="verdict-band start-band"><div class="wrap verdict">
    <div class="verdict-text">
      <h1>No run in this server session yet.</h1>
      <p class="lede">Run the suite to send 36 synthetic claims through the agent and apply four checks: coverage limit, evidence grounding, prompt injection and personal data.${last ? ` The last saved run is #${last.runNumber}, ${esc(when(last.timestamp))}; see Runs.` : ''}</p>
      <button class="btn btn-primary btn-l" type="button" data-act="run" ${state.running ? 'disabled' : ''}>${icon('play')}Run assurance suite</button>
    </div>
    ${neutralLattice()}
  </div></section>
  <div class="wrap"><div class="start-facts">
    <div><b class="num">36</b><span>synthetic claims in five batches</span></div>
    <div><b class="num">4</b><span>numeric checks on every reply</span></div>
    <div><b class="num">90%</b><span>to certify a batch, with no critical failure</span></div>
    <div><b class="num">${state.runs.length}</b><span>run${state.runs.length === 1 ? '' : 's'} saved in history</span></div>
  </div></div>`;
}

function latticePanel(r, animate) {
  const rows = r.batches.map((b, bi) => {
    const m = batchCells(b, r.failedCases);
    let i = bi * 8;
    const cells = cellsHtml(m).replace(/class="cell /g, () => `style="--i:${i++}" class="cell `);
    return `<div class="lrow${state.changed.includes(b.batch) ? ' changed' : ''}">
      <a class="lrow-n" href="#batches?b=${b.batch}" title="${esc(batchName(b.batch))}">B${b.batch}</a>
      <div class="lcells" role="group" aria-label="${esc(cellSummary(b, m))}">${cells}</div>
      <span class="lrow-rate num ${rateTone(b.overallPassRate)}">${esc(pct(b.overallPassRate))}</span>
      ${chip(b.finalStatus, '', state.changed.includes(b.batch) ? 'changed' : '')}
    </div>`;
  }).join('');
  const total = r.batches.reduce((a, b) => a + b.casesTotal, 0);
  return `<section class="lattice panel${animate ? ' enter' : ''}" aria-labelledby="latticeH" data-lattice>
    <div class="lattice-h"><h2 id="latticeH">Case lattice</h2><span>${total} claims · arrow keys move between failed cells</span></div>
    <div class="lrows">${rows}</div>
    ${legendHtml()}
  </section>`;
}

function verdictBand(r, animate) {
  const v = verdictOf(r);
  const s = summary(r);
  const order = ['CERTIFIED', 'NEEDS_HUMAN_REVIEW', 'BLOCKED', 'INCOMPLETE', 'NO_DATA'];
  const tally = order.filter((k) => s.counts[k]).map((k) => `<span class="chip" data-s="${k}">${statusIcon(k)}<span>${s.counts[k]} ${esc(statusLabel(k))}</span></span>`).join('');
  const mock = r.provider === 'mock';
  const alerts = r.driftAlerts || [];
  const prev = alerts.length ? (alerts[0].match(/run #(\d+)/) || [])[1] : null;
  return `<section class="verdict-band${animate ? ' enter' : ''}" aria-labelledby="verdictH"><div class="wrap verdict">
    <div class="verdict-text">
      ${chip(v.status, 'chip-l')}
      <h1 id="verdictH">${esc(v.text)}</h1>
      <div class="tally" aria-label="Batches by final status">${tally}</div>
      <div class="meta">
        ${r.runNumber ? `<span>Run <b>#${r.runNumber}</b></span>` : ''}
        <span>Agent <b>${esc(mock ? 'mock (simulated)' : r.provider)}</b></span>
        <span>Model <b>${esc(r.model)}</b></span>
        ${mock ? '' : `<span>Prompt <b>${esc(r.promptVersion)}</b></span>`}
        ${r.timestamp ? `<span>Issued <b>${esc(when(r.timestamp))}</b></span>` : ''}
      </div>
      ${alerts.length ? `<a class="drift-line" href="#drift">${icon('alert')}<span><b>${alerts.length} drift alert${alerts.length === 1 ? '' : 's'}</b> against run #${esc(prev || '?')}, same agent, model and prompt</span>${icon('arrow')}</a>` : ''}
    </div>
    ${latticePanel(r, animate)}
  </div></section>`;
}

function ticks(total, filled, hatched) {
  let h = '';
  for (let i = 0; i < total; i++) h += `<i class="${i < filled ? 'on' : i < filled + hatched ? 'err' : ''}" style="--i:${i}"></i>`;
  return `<span class="ticks" aria-hidden="true">${h}</span>`;
}

function countAttr(value, fmt) {
  return `data-count-to="${value}" data-fmt="${fmt}"`;
}

function figures(r) {
  const s = summary(r);
  const tone = rateTone(s.overall);
  const crit = (r.failedCases || []).filter(isCritical);
  const byRule = {};
  crit.forEach((f) => { byRule[f.ruleViolated] = (byRule[f.ruleViolated] || 0) + 1; });
  const ruleParts = Object.entries(byRule).sort((a, b) => b[1] - a[1]);
  const shortRule = { coverage_limit_exceeded: 'over the policy limit', followed_injected_instruction: 'hidden instruction followed', amount_not_supported_by_documents: 'amount not in any document' };
  const critViz = s.critical
    ? `<span class="segs" aria-hidden="true">${ruleParts.map(([, n]) => `<span style="flex:${n}"></span>`).join('')}</span>
       <ul class="seg-l">${ruleParts.map(([k, n]) => `<li><a href="#findings?rule=${encodeURIComponent(k)}"><b class="num">${n}</b> ${esc(shortRule[k] || ruleText(k))}</a></li>`).join('')}</ul>`
    : '<span class="fig-none">None in this run</span>';
  return `<section class="figs" aria-label="Key figures">
    <div class="fig"><div class="v num"><span ${countAttr(s.tested, 'int')}>${s.tested}</span><small>/${s.total}</small></div><div class="l">Claims scored</div>
      ${ticks(s.total, s.tested, s.total - s.tested)}</div>
    <div class="fig ${tone}"><div class="v num"><span ${countAttr(s.overall == null ? '' : (s.overall * 100).toFixed(1), 'pct')}>${pct(s.overall)}</span></div><div class="l">Overall pass rate, weighted by claims scored</div>
      ${rateBar(s.overall, 'Overall pass rate')}</div>
    <div class="fig ${s.critical ? 'bad' : 'good'}"><div class="v num"><span ${countAttr(s.critical, 'int')}>${s.critical}</span></div><div class="l">Critical failures: could cause a wrong payout</div>${critViz}</div>
    <div class="fig ${s.errors ? 'warn' : ''}"><div class="v num"><span ${countAttr(s.errors, 'int')}>${s.errors}</span></div><div class="l">API errors: model calls that failed and were not scored</div>
      ${s.errors ? ticks(s.total, 0, s.errors) : '<span class="fig-none">None in this run</span>'}</div>
    <div class="fig ${s.pending ? 'warn' : 'good'}"><div class="v num"><span ${countAttr(s.pending, 'int')}>${s.pending}</span></div><div class="l">Batches waiting for a person to approve or reject</div>
      ${s.pending ? `<span class="pend">${s.pendingList.map((n) => `<a class="pend-b" href="#batches?b=${n}">B${n}</a>`).join('')}</span>` : '<span class="fig-none">Nothing waiting</span>'}</div>
  </section>`;
}

function driftSection(r) {
  const alerts = r.driftAlerts || [];
  if (!alerts.length) return '';
  const shown = state.showAllDrift ? alerts : alerts.slice(0, 3);
  return `<section class="drift" id="drift" aria-labelledby="driftH" tabindex="-1">
    ${icon('alert')}
    <div>
      <h2 id="driftH">Drift: this run is worse than the previous run with the same agent, model and prompt</h2>
      <ul>${shown.map((a) => `<li>${esc(a)}</li>`).join('')}</ul>
      <p class="note">Compared only with runs of the same setup; switching prompt v1 to v2 is calibration, not drift. <a href="#runs">See all runs</a></p>
    </div>
    ${alerts.length > 3 ? `<button class="btn btn-s" type="button" data-act="toggle-drift" aria-expanded="${state.showAllDrift}">${state.showAllDrift ? 'Show fewer' : `Show all ${alerts.length} alerts`}</button>` : ''}
  </section>`;
}

function decisionList(r) {
  const pend = pendingBatches(r);
  if (!pend.length) return '';
  const rows = pend.map((n) => {
    const b = r.batches.find((x) => x.batch === n);
    if (!b) return '';
    return `<li class="dec-row" data-pend="${n}" tabindex="-1">
      <span class="dec-n num">B${n}</span>
      <span class="dec-name"><b>${esc(batchName(n))}</b><span>${b.criticalFailures} critical · ${b.casesTested}/${b.casesTotal} scored</span></span>
      <span class="dec-bar">${rateBar(b.overallPassRate, `Batch ${n}`)}</span>
      <span class="dec-rate num ${rateTone(b.overallPassRate)}">${esc(pct(b.overallPassRate))}</span>
      ${chip(b.finalStatus)}
      ${decisionButtons(n)}
    </li>`;
  }).join('');
  return `<section class="sec decisions" aria-labelledby="decH">
    <div class="sec-h"><h2 id="decH">Waiting for your decision</h2><p>Anything not certified goes to a person. Approving certifies the batch for this run; rejecting blocks it. Both are logged.</p></div>
    <ul class="dec-list">${rows}</ul></section>`;
}

function decisionButtons(n) {
  const dis = state.running ? 'disabled' : '';
  return `<span class="decide">
    <button class="btn btn-s btn-approve" type="button" data-review="${n}" data-approve="true" ${dis}>${icon('certified')}Approve</button>
    <button class="btn btn-s btn-reject" type="button" data-review="${n}" data-approve="false" ${dis}>${icon('blocked')}Reject</button></span>`;
}

function overview(animate) {
  if (!hasRun()) return startState();
  const r = state.report;
  return verdictBand(r, animate) + `<div class="wrap">${consistencyNotice(r)}${figures(r)}${driftSection(r)}${decisionList(r)}</div>`;
}

/* ----- Batches ----- */

function decisionCell(b, r) {
  if (isPending(r, b.batch)) return decisionButtons(b.batch);
  if (b.humanOverridden) {
    const entry = state.log.slice().reverse().find((x) => x.batch === b.batch && x.runNumber === r.runNumber);
    return `<span class="signed">${icon('certified')}Signed off${entry ? ` by ${esc(entry.reviewer)}` : ' by a reviewer'}</span>`;
  }
  if (b.finalStatus === 'INCOMPLETE' || b.finalStatus === 'NO_DATA') return '<span class="muted">Re-run needed</span>';
  return '<span class="muted">No decision needed</span>';
}

function dimLine(b) {
  const d = [['Coverage', b.coveragePassRate], ['Evidence', b.conflictPassRate], ['Injection', b.injectionPassRate], ['Personal data', b.piiPassRate]];
  return d.map(([k, v]) => `<span><span class="muted">${k}</span> <b class="num ${v == null ? '' : rateTone(v)}">${v == null ? '—' : esc(pct(v))}</b></span>`).join('');
}

function whyNotScored(b) {
  if (b.finalStatus === 'NO_DATA') return `No claim in this batch was scored: every model call failed (${b.errorCount} API error${b.errorCount === 1 ? '' : 's'}). Re-run the suite.`;
  if (b.finalStatus === 'INCOMPLETE') return `${b.casesTested} of ${b.casesTotal} claims scored; at least ${Math.round(RULES.MIN_TESTED_SHARE * 100)}% must be scored before a status is given. The model call failed for the rest. Re-run the suite.`;
  return '';
}

const dimCell = (v, label) => `<td class="dimcell ${v == null ? 'na' : rateTone(v)}" data-l="${label}">${v == null ? '—' : esc(pct(v))}</td>`;

function batches(animate) {
  if (!hasRun()) {
    return phead('Batches', 'Five batches of synthetic claims, each with its own status.') +
      `<div class="wrap">${emptyState('No run in this server session yet', 'Run the suite to score the 36 claims; each batch then gets its pass rates, status and lattice here.', runAction())}</div>`;
  }
  const r = state.report;
  const s = summary(r);
  const rows = r.batches.map((b) => {
    const m = batchCells(b, r.failedCases);
    const meta = BATCHES[b.batch] || { name: `Batch ${b.batch}`, desc: '' };
    const changed = state.changed.includes(b.batch);
    const auto = b.humanOverridden
      ? `<span class="auto">Automatic result: ${esc(statusLabel(b.autoStatus))} · signed off by a reviewer</span>`
      : (b.autoStatus !== b.finalStatus ? `<span class="auto">Automatic result: ${esc(statusLabel(b.autoStatus))}</span>` : '');
    const why = whyNotScored(b);
    return `<tr id="batch-${b.batch}" class="${state.focusBatch === b.batch ? 'focus' : ''}${changed ? ' changed' : ''}">
      <td class="b-no" data-l="No.">${b.batch}</td>
      <th scope="row" class="b-name wide"><b>${esc(meta.name)}</b><span>${esc(meta.desc)}</span>${why ? `<p class="why">${icon('incomplete')}${esc(why)}</p>` : ''}</th>
      <td class="wide" data-l="Claims (lattice)"><div class="lcells" role="group" aria-label="${esc(cellSummary(b, m))}">${cellsHtml(m)}</div></td>
      <td class="n" data-l="Scored">${b.casesTested}/${b.casesTotal}</td>
      ${dimCell(b.coveragePassRate, 'Coverage')}${dimCell(b.conflictPassRate, 'Evidence')}${dimCell(b.injectionPassRate, 'Injection')}${dimCell(b.piiPassRate, 'Personal data')}
      <td class="b-rate" data-l="Overall"><span class="v ${rateTone(b.overallPassRate)}">${esc(pct(b.overallPassRate))}</span>${rateBar(b.overallPassRate, `Batch ${b.batch} overall pass rate`)}</td>
      <td class="n" data-l="Critical">${b.criticalFailures}${b.errorCount ? `<br><span class="warn-t">${b.errorCount} err</span>` : ''}</td>
      <td class="b-status" data-l="Status" tabindex="-1">${chip(b.finalStatus, '', changed ? 'changed' : '')}${auto}</td>
      <td class="wide" data-l="Decision">${decisionCell(b, r)}</td>
    </tr>`;
  }).join('');
  const line = `${s.counts.CERTIFIED || 0} of ${r.batches.length} certified${s.pending ? ` · ${s.pending} waiting for a decision` : ''} · run #${r.runNumber || '—'}. Certified at 90% or more, no critical failure, at least 75% scored; a person decides the rest.`;
  return phead('Batches', esc(line)) + `<div class="wrap"><section class="${animate ? 'enter' : ''}" aria-label="Batches">
    <div class="tscroll"><table class="ltable breg stack">
      <thead><tr><th scope="col">No.</th><th scope="col">Batch</th><th scope="col">Claims</th><th scope="col" class="n">Scored</th><th scope="col" class="n">Cover.</th><th scope="col" class="n">Evid.</th><th scope="col" class="n">Inject.</th><th scope="col" class="n">PII</th><th scope="col">Overall</th><th scope="col" class="n">Crit.</th><th scope="col">Status</th><th scope="col">Decision</th></tr></thead>
      <tbody>${rows}</tbody></table></div>
    ${legendHtml()}
  </section></div>`;
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
  if (!hasRun()) {
    return phead('Findings', 'Every failed check of the current run, with its evidence.') +
      `<div class="wrap">${emptyState('Nothing to show until a run has finished', 'Findings come from the run loaded on the server. Run the suite, then every failed check appears here with its rule and the agent\'s raw output.', runAction())}</div>`;
  }
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
    ${state.filter.rule ? `<button type="button" class="fbtn" data-filter="rule" data-value="" aria-pressed="true" aria-label="Remove filter: ${esc(ruleText(state.filter.rule))}">${esc(ruleText(state.filter.rule))} ${icon('close')}</button>` : ''}
  </div>`;
  let body;
  if (!all.length) body = emptyState(`No failed checks in ${r.runNumber ? `run #${r.runNumber}` : 'this run'}`, 'Every scored check passed. Nothing needs evidence.');
  else if (!shown.length) body = emptyState('No findings match these filters', `${all.length} finding${all.length === 1 ? '' : 's'} in total. Change or clear a filter above.`);
  else {
    const models = new Map(r.batches.map((b) => [b.batch, batchCells(b, r.failedCases)]));
    body = `<div class="tscroll"><table class="ltable stack">
      <thead><tr><th scope="col">No.</th><th scope="col">Case</th><th scope="col">Where in its batch</th><th scope="col">Check</th><th scope="col">What happened</th><th scope="col">Severity</th></tr></thead>
      <tbody>${shown.map((f) => {
        const sev = isApiError(f) ? '<span class="sev sev-error">API error</span>' : isCritical(f) ? '<span class="sev sev-crit">Critical</span>' : '<span class="sev">Standard</span>';
        const m = models.get(f.batch);
        return `<tr data-href="${caseHref(f)}">
          <td class="fno" data-l="No.">F-${pad2(index.get(`${f.caseId}/${f.dimension}`))}</td>
          <td data-l="Case"><a class="case-link" href="${caseHref(f)}" data-key="${esc(`${f.caseId}/${f.dimension}`)}">${esc(f.caseId)}</a></td>
          <td data-l="Batch ${esc(f.batch)}">${m ? miniLattice(m, f.caseId, `${f.caseId} within batch ${f.batch}`) : ''} <span class="fno">B${esc(f.batch)}</span></td>
          <td data-l="Check">${esc(dimensionLabel(f.dimension))}</td>
          <td class="wide" data-l="What happened">${esc(ruleText(f.ruleViolated))}</td>
          <td data-l="Severity">${sev}</td></tr>`;
      }).join('')}</tbody></table></div>`;
  }
  const crit = count(isCritical);
  return phead('Findings', esc(`${all.length} failed check${all.length === 1 ? '' : 's'} in run #${r.runNumber || '—'}, ${crit} critical. Select a row for the rule, the values compared and the agent's raw output.`),
    `<span class="fcount" aria-live="polite">${shown.length} of ${all.length} shown</span>`, filters) +
    `<div class="wrap"><section aria-label="Findings">${body}</section></div>`;
}

/* ----- Runs ----- */

function runs() {
  const n = state.runs.length;
  const latest = n ? state.runs[n - 1] : null;
  const prev = latest ? previousComparable(state.runs, latest) : null;
  const lede = n
    ? `${n} saved run${n === 1 ? '' : 's'}. Latest #${latest.runNumber}: ${pct(runOverall(latest))} overall${prev ? `, against ${pct(runOverall(prev))} in run #${prev.runNumber} of the same setup` : ''}.`
    : 'No runs saved yet.';
  return phead('Runs', esc(lede)) + `<div class="wrap">${n ? runsView(state.runs, state.openRun) : emptyState('No runs saved yet', 'Every run is saved and compared with the previous run that used the same provider, model and prompt. Start one from the Overview.', runAction())}</div>`;
}

/* ----- Reviews ----- */

function reviews() {
  const r = state.report;
  const pend = hasRun() ? pendingBatches(r) : [];
  const pendHtml = pend.length
    ? `<div class="notice">${icon('review')}<div><h2>${pend.length} batch${pend.length === 1 ? '' : 'es'} waiting for a decision in run #${r.runNumber}</h2>
       <p>${pend.map((n) => `<a href="#batches?b=${n}">Batch ${n}, ${esc(batchName(n))}</a>`).join(' · ')}</p></div></div>` : '';
  const log = state.log.slice().reverse();
  // A batch's case lattice is only known for the run loaded on the server; older decisions show "—".
  const models = hasRun() ? new Map(r.batches.map((b) => [b.batch, batchCells(b, r.failedCases)])) : new Map();
  const table = log.length ? `<div class="tscroll"><table class="ltable log-t stack">
      <thead><tr><th scope="col">Time (UTC)</th><th scope="col">Run</th><th scope="col">Batch</th><th scope="col">Its claims</th><th scope="col">Decision</th><th scope="col">Reviewer</th><th scope="col">Note</th></tr></thead>
      <tbody>${log.map((x) => {
        const m = hasRun() && x.runNumber === r.runNumber ? models.get(x.batch) : null;
        return `<tr>
        <td class="num" data-l="Time (UTC)">${esc(String(x.timestamp || '').replace('T', ' ').substring(0, 19))}</td>
        <td class="num" data-l="Run">#${esc(x.runNumber)}</td>
        <td data-l="Batch"><b class="num">B${esc(x.batch)}</b> ${esc(batchName(x.batch))}</td>
        <td data-l="Its claims">${m ? miniLattice(m, null, `Batch ${x.batch} claims in run ${x.runNumber}`) : '<span class="fno" title="Case results are kept only for the run loaded on the server">—</span>'}</td>
        <td data-l="Decision">${x.approved ? `<span class="dec-mark ok">${icon('certified')}Approved</span>` : `<span class="dec-mark no">${icon('blocked')}Rejected</span>`}</td>
        <td data-l="Reviewer">${esc(x.reviewer)}</td>
        <td class="wide" data-l="Note">${x.reason ? esc(x.reason) : '<span class="fno">—</span>'}</td></tr>`;
      }).join('')}</tbody></table></div>`
    : emptyState('No decisions recorded yet', 'Approve or reject a waiting batch on Batches or the Overview. Each decision is logged here with who, why and when.', hasRun() && pend.length ? `<a class="btn" href="#batches">Go to waiting batches</a>` : '');
  const a = state.log.filter((x) => x.approved).length;
  return phead('Reviews', esc(`${state.log.length} decision${state.log.length === 1 ? '' : 's'} in the audit log: ${a} approved, ${state.log.length - a} rejected. A decision applies to the run it was made on.`)) +
    `<div class="wrap"><section aria-label="Review log">${pendHtml}${table}</section></div>`;
}

const VIEWS = { overview, batches, findings, runs, reviews };

/* ---------- render ---------- */

function render() {
  renderShell();
  const r = state.report;
  const animate = hasRun() && !reduced() && state.animatedRun !== `${r.runNumber}|${r.timestamp}` && state.phase === 'ready';
  let html;
  if (state.phase === 'loading') html = skeleton();
  else if (state.phase === 'unreachable') html = unreachable();
  else html = (VIEWS[state.view] || overview)(animate);
  const notice = state.phase === 'ready' ? noticeHtml() : '';
  const ae = document.activeElement;
  if (state.drawer && ae && ae.dataset && ae.dataset.key) setReturnKey(ae.dataset.key);
  $('#view').innerHTML = (notice ? `<div class="wrap notice-wrap">${notice}</div>` : '') + html;
  if (animate && (state.view === 'overview' || state.view === 'batches')) {
    state.animatedRun = `${r.runNumber}|${r.timestamp}`;
    countUp();
  }
  document.body.classList.toggle('is-running', state.running);
  syncDrawer();
  if (state.focusBatch) {
    const el = document.getElementById(`batch-${state.focusBatch}`);
    if (el) el.scrollIntoView({ block: 'center', behavior: reduced() ? 'auto' : 'smooth' });
  }
  state.changed = [];
}

/** One-time count-up of headline figures. The final value is already in the DOM (screenshots,
 *  no-JS and reduced motion all show it); this only animates from zero to it. */
function countUp() {
  const els = document.querySelectorAll('[data-count-to]');
  const t0 = performance.now();
  const dur = 900;
  const targets = [...els].map((el) => ({ el, to: parseFloat(el.dataset.countTo), fmt: el.dataset.fmt, final: el.textContent }))
    .filter((x) => !Number.isNaN(x.to));
  const step = (now) => {
    const k = Math.min(1, (now - t0) / dur);
    const e = 1 - Math.pow(1 - k, 4);
    for (const x of targets) {
      x.el.textContent = k >= 1 ? x.final : x.fmt === 'pct' ? `${(x.to * e).toFixed(1)}%` : String(Math.round(x.to * e));
    }
    if (k < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
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

function filterQuery() {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(state.filter)) if (v && v !== 'all') q.set(k, v);
  const s = q.toString();
  return s ? `?${s}` : '';
}

function closeFromDrawer() {
  state.drawer = null;
  history.replaceState(null, '', `#${state.view}${state.view === 'findings' ? filterQuery() : ''}`);
  closeDrawer();
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
  } else if (parts[0] === 'drift') {
    state.drawer = null;
    state.view = 'overview';
    state.routed = true;
    render();
    const d = document.getElementById('drift');
    if (d) { d.scrollIntoView({ block: 'center', behavior: reduced() ? 'auto' : 'smooth' }); d.focus({ preventScroll: true }); }
    return;
  } else {
    state.drawer = null;
    state.view = VIEWS[parts[0]] ? parts[0] : 'overview';
    const q = new URLSearchParams(query);
    if (state.view === 'findings') {
      state.filter = { dim: q.get('dim') || 'all', batch: q.get('batch') || 'all', sev: q.get('sev') || 'all', rule: q.get('rule') || '' };
    }
    state.focusBatch = state.view === 'batches' && q.get('b') ? Number(q.get('b')) : null;
    state.openRun = state.view === 'runs' && parts[1] ? Number(parts[1]) : null;
  }
  state.routed = true;
  render();
  if (prev !== state.view && !state.drawer) {
    $('#main').focus({ preventScroll: true });
    if (!state.focusBatch) window.scrollTo({ top: 0 });
  }
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
  const rv = ev.target.closest('[data-review]');
  if (rv) { review(Number(rv.dataset.review), rv.dataset.approve === 'true', rv); return; }
  const row = ev.target.closest('tr[data-href]');
  if (row && !ev.target.closest('a')) { location.hash = row.dataset.href; return; }
  const a = ev.target.closest('[data-act]');
  if (!a) return;
  const act = a.dataset.act;
  if (act === 'run' || act === 'retry-run') runSuite();
  else if (act === 'reload') { state.phase = 'loading'; render(); loadAll(); }
  else if (act === 'toggle-drift') { state.showAllDrift = !state.showAllDrift; render(); $('[data-act="toggle-drift"]')?.focus(); }
});

// Lattice keyboard: arrow keys move between the failed (linked) cells of the Overview lattice.
document.addEventListener('keydown', (ev) => {
  const cell = ev.target.closest && ev.target.closest('[data-lattice] a.cell');
  if (!cell || !['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp', 'Home', 'End'].includes(ev.key)) return;
  const all = [...document.querySelectorAll('[data-lattice] a.cell')];
  const i = all.indexOf(cell);
  let j = i;
  if (ev.key === 'ArrowRight' || ev.key === 'ArrowDown') j = Math.min(all.length - 1, i + 1);
  if (ev.key === 'ArrowLeft' || ev.key === 'ArrowUp') j = Math.max(0, i - 1);
  if (ev.key === 'Home') j = 0;
  if (ev.key === 'End') j = all.length - 1;
  ev.preventDefault();
  all[j].focus();
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

// Presenter notes appear only with ?demo=1 in the address.
if (new URLSearchParams(location.search).get('demo') === '1') $('#demoNotes').hidden = false;

initDrawer(closeFromDrawer);
window.addEventListener('hashchange', route);
route();
loadAll();

export { state };
