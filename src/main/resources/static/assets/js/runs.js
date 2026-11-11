// Runs view: saved run history (GET /api/runs). History stores batch summaries only; case-level
// results of earlier runs are not saved, so nothing here goes below batch level.
import { esc, pct, when } from './format.js';
import { statusLabel, batchName } from './labels.js';
import { RULES } from './rules.js';
import { icon, statusIcon } from './icons.js';

const sameConfig = (a, b) => a && b && a.provider === b.provider && a.model === b.model && a.promptVersion === b.promptVersion;
const configLabel = (r) => `${r.provider}${r.provider === 'mock' ? '' : ` · ${r.model}`}${r.promptVersion && r.promptVersion !== 'n/a' ? ` · prompt ${r.promptVersion}` : ''}`;

export function runOverall(r) {
  let w = 0, n = 0;
  for (const b of r.batches || []) { w += b.overallPassRate * b.casesTested; n += b.casesTested; }
  return n ? w / n : null;
}

/** Previous run with the same provider, model and prompt (the one drift compares against). */
export function previousComparable(runs, run) {
  const earlier = runs.filter((r) => r.runNumber < run.runNumber && sameConfig(r, run));
  return earlier.length ? earlier[earlier.length - 1] : null;
}

const miniChip = (b) => `<span class="mchip" data-s="${esc(b.finalStatus || b.autoStatus)}" title="Batch ${b.batch}: ${esc(statusLabel(b.finalStatus || b.autoStatus))}">${statusIcon(b.finalStatus || b.autoStatus)}<span>B${b.batch}</span></span>`;

/** Small-multiples chart: one panel per batch, overall pass rate per run, bands at 70 and 90.
 *  Points are joined only between consecutive runs with the same configuration, so a change of
 *  prompt or model shows as a break (calibration, not drift). */
function chart(runs) {
  const batches = [...new Set(runs.flatMap((r) => (r.batches || []).map((b) => b.batch)))].sort((a, b) => a - b);
  const W = 260, H = 176, P = { l: 30, r: 12, t: 12, b: 24 };
  const x = (i) => P.l + (runs.length === 1 ? (W - P.l - P.r) / 2 : (i * (W - P.l - P.r)) / (runs.length - 1));
  const y = (v) => P.t + (1 - v) * (H - P.t - P.b);
  const panels = batches.map((n) => {
    let path = '';
    let pts = '';
    runs.forEach((r, i) => {
      const b = (r.batches || []).find((q) => q.batch === n);
      if (!b) return;
      const prev = i > 0 ? runs[i - 1] : null;
      const joined = prev && sameConfig(prev, r) && (prev.batches || []).some((q) => q.batch === n);
      path += `${joined ? 'L' : 'M'}${x(i).toFixed(1)},${y(b.overallPassRate).toFixed(1)}`;
      pts += `<circle cx="${x(i).toFixed(1)}" cy="${y(b.overallPassRate).toFixed(1)}" r="4.5" class="pt" data-s="${esc(b.autoStatus)}"><title>Run #${r.runNumber}, ${esc(configLabel(r))}: ${esc(pct(b.overallPassRate))}, ${esc(statusLabel(b.autoStatus))}</title></circle>`;
    });
    const ticks = runs.map((r, i) => `<text x="${x(i).toFixed(1)}" y="${H - 6}" class="tx" text-anchor="middle">#${r.runNumber}</text>`).join('');
    return `<figure class="rc-panel">
      <figcaption><b>Batch ${n}</b> ${esc(batchName(n))}</figcaption>
      <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Batch ${n} overall pass rate across ${runs.length} runs">
        <rect x="${P.l}" y="${y(1)}" width="${W - P.l - P.r}" height="${y(RULES.CERTIFIED_AT) - y(1)}" class="band band-c"/>
        <rect x="${P.l}" y="${y(RULES.CERTIFIED_AT)}" width="${W - P.l - P.r}" height="${y(RULES.REVIEW_AT) - y(RULES.CERTIFIED_AT)}" class="band band-r"/>
        <rect x="${P.l}" y="${y(RULES.REVIEW_AT)}" width="${W - P.l - P.r}" height="${y(0) - y(RULES.REVIEW_AT)}" class="band band-b"/>
        <text x="${P.l - 6}" y="${y(RULES.CERTIFIED_AT) + 4}" class="ty" text-anchor="end">90</text>
        <text x="${P.l - 6}" y="${y(RULES.REVIEW_AT) + 4}" class="ty" text-anchor="end">70</text>
        <text x="${P.l - 6}" y="${y(0) + 4}" class="ty" text-anchor="end">0</text>
        <path d="${path}" class="ln"/>${pts}${ticks}
      </svg></figure>`;
  }).join('');
  return `<div class="rc">${panels}</div>
    <p class="rc-key"><span class="k k-c"></span>certified zone (90%+) <span class="k k-r"></span>review zone <span class="k k-b"></span>blocked zone · a line joins runs only when provider, model and prompt are the same; a gap means the setup changed (calibration, not drift)</p>`;
}

function delta(now, before) {
  if (now == null || before == null) return '<span class="muted">—</span>';
  const d = (now - before) * 100;
  if (Math.abs(d) < 0.05) return '<span class="muted">no change</span>';
  return `<span class="dl ${d < 0 ? 'down' : 'up'}">${d > 0 ? '+' : '−'}${Math.abs(d).toFixed(1)} pts</span>`;
}

function runDetail(runs, run) {
  const prev = previousComparable(runs, run);
  const rows = (run.batches || []).map((b) => {
    const pb = prev && (prev.batches || []).find((q) => q.batch === b.batch);
    return `<tr>
      <th scope="row"><span class="num">B${b.batch}</span> ${esc(batchName(b.batch))}</th>
      <td class="num" data-l="Scored">${b.casesTested}/${b.casesTotal}</td>
      <td class="num" data-l="Coverage">${esc(pct(b.coveragePassRate))}</td><td class="num" data-l="Evidence">${esc(pct(b.conflictPassRate))}</td>
      <td class="num" data-l="Injection">${esc(pct(b.injectionPassRate))}</td><td class="num" data-l="Personal data">${esc(pct(b.piiPassRate))}</td>
      <td class="num strong" data-l="Overall">${esc(pct(b.overallPassRate))}</td>
      <td data-l="Previous comparable">${pb ? `${esc(pct(pb.overallPassRate))} → ${delta(b.overallPassRate, pb.overallPassRate)}` : '<span class="muted">—</span>'}</td>
      <td class="num" data-l="Critical">${b.criticalFailures}</td>
      <td data-l="Automatic status"><span class="chip" data-s="${esc(b.autoStatus)}">${statusIcon(b.autoStatus)}<span>${esc(statusLabel(b.autoStatus))}</span></span></td></tr>`;
  }).join('');
  const alerts = run.driftAlerts || [];
  return `<section class="run-detail panel" aria-labelledby="rdH">
    <div class="rd-head">
      <div><h3 id="rdH">Run #${run.runNumber}</h3>
        <p class="muted">${esc(when(run.timestamp))} · ${esc(configLabel(run))} · ${run.casesTested} of ${run.casesTotal} scored${run.apiErrors ? ` · ${run.apiErrors} API errors` : ''}</p></div>
      <a class="btn btn-s" href="#runs">${icon('close')}Close run</a>
    </div>
    <p class="rd-cmp">${prev ? `Compared with run #${prev.runNumber}, the previous run with the same provider, model and prompt.` : 'No earlier run used the same provider, model and prompt, so there is nothing to compare for drift.'}</p>
    ${alerts.length ? `<div class="drift-list" role="note">${icon('alert')}<div><b>${alerts.length} drift alert${alerts.length === 1 ? '' : 's'} raised by this run</b><ul>${alerts.map((a) => `<li>${esc(a)}</li>`).join('')}</ul></div></div>` : '<p class="muted">No drift alert was raised by this run.</p>'}
    <div class="tscroll"><table class="ltable stack">
      <thead><tr><th scope="col">Batch</th><th scope="col">Scored</th><th scope="col">Coverage</th><th scope="col">Evidence</th><th scope="col">Injection</th><th scope="col">Personal data</th><th scope="col">Overall</th><th scope="col">Previous comparable</th><th scope="col">Critical</th><th scope="col">Automatic status</th></tr></thead>
      <tbody>${rows}</tbody></table></div>
    <p class="muted small">History keeps batch summaries only. Case-level evidence exists only for the run currently loaded on the server, and human decisions are kept in the review log.</p>
  </section>`;
}

/**
 * @param {Array} runs history, oldest first
 * @param {number|null} openRun run number to expand
 */
export function runsView(runs, openRun) {
  if (!runs.length) {
    return `<section class="sec"><div class="empty">No runs are saved yet. Run the suite from the Overview; every run is saved and compared with the last run that used the same setup.</div></section>`;
  }
  const sorted = runs.slice().sort((a, b) => a.runNumber - b.runNumber);
  const latest = sorted[sorted.length - 1];
  const list = sorted.slice().reverse().map((r) => {
    const o = runOverall(r);
    const prev = previousComparable(sorted, r);
    const d = prev ? delta(o, runOverall(prev)) : '<span class="muted">first of its setup</span>';
    const alerts = (r.driftAlerts || []).length;
    const isLatest = r.runNumber === latest.runNumber;
    return `<tr class="${openRun === r.runNumber ? 'open' : ''}${isLatest ? ' latest' : ''}" data-href="#runs/${r.runNumber}">
      <td data-l="Run"><a class="num strong" href="#runs/${r.runNumber}">#${r.runNumber}</a>${isLatest ? '<span class="latest-tag">Latest</span>' : ''}</td>
      <td class="num" data-l="Time (UTC)">${esc(when(r.timestamp))}</td>
      <td data-l="Agent">${esc(r.provider)}${r.provider === 'mock' ? '<span class="tag-sim">simulated</span>' : ''}</td>
      <td class="mono small" data-l="Model">${esc(r.model)}</td>
      <td data-l="Prompt">${esc(r.promptVersion && r.promptVersion !== 'n/a' ? r.promptVersion : '—')}</td>
      <td class="num" data-l="Scored">${r.casesTested}/${r.casesTotal}${r.apiErrors ? ` <span class="warn-t">${r.apiErrors} err</span>` : ''}</td>
      <td class="num strong" data-l="Overall">${esc(pct(o))}</td>
      <td data-l="vs previous same setup">${d}</td>
      <td class="wide" data-l="Batch lattice (status per batch)"><span class="mchips" role="img" aria-label="Batch statuses: ${esc((r.batches || []).map((b) => `B${b.batch} ${statusLabel(b.finalStatus || b.autoStatus)}`).join(', '))}">${(r.batches || []).map(miniChip).join('')}</span></td>
      <td data-l="Drift">${alerts ? `<span class="drift-badge">${icon('alert')}${alerts}</span>` : '<span class="muted">—</span>'}</td></tr>`;
  }).join('');
  const open = openRun ? sorted.find((r) => r.runNumber === openRun) : null;
  return `<section class="sec" aria-labelledby="runsChartH">
      <div class="sec-h"><h2 id="runsChartH">Pass rate by batch, run after run</h2><p>Bands: certified 90%+, review 70–90%, blocked below 70%.</p></div>
      ${chart(sorted)}
    </section>
    ${open ? runDetail(sorted, open) : (openRun ? `<div class="notice">${icon('alert')}<div><h2>Run #${esc(openRun)} is not in the saved history.</h2></div></div>` : '')}
    <section class="sec" aria-labelledby="runsListH">
      <div class="sec-h"><h2 id="runsListH">All runs</h2><p>Select a run to see its batches and how it compares with the previous run of the same setup.</p></div>
      <div class="tscroll"><table class="ltable runs-t stack">
        <thead><tr><th scope="col">Run</th><th scope="col">Time (UTC)</th><th scope="col">Agent</th><th scope="col">Model</th><th scope="col">Prompt</th><th scope="col">Scored</th><th scope="col">Overall</th><th scope="col">vs previous same setup</th><th scope="col">Batches</th><th scope="col">Drift</th></tr></thead>
        <tbody>${list}</tbody></table></div>
      <p class="muted small">Drift alerts compare a run only with the previous run that used the same provider, model and prompt. Switching the prompt from v1 to v2 is calibration, not drift.</p>
    </section>`;
}
