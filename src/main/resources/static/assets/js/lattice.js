// Case Lattice: one cell per claim, grouped by batch.
// Honesty rule: the report lists FAILED checks only. A cell carries a case ID only when the
// report names that case. Passed claims are known only as a count (casesTested minus the
// distinct failed cases), so they are drawn without IDs. Anything the report does not account
// for is drawn as "unknown", never guessed.
import { esc } from './format.js';
import { isCritical, isApiError } from './rules.js';
import { ruleText, batchName } from './labels.js';

/** Builds the cell model for one batch from the report. */
export function batchCells(b, failedCases) {
  const rows = (failedCases || []).filter((f) => f.batch === b.batch);
  const byCase = new Map();
  for (const f of rows) {
    if (!byCase.has(f.caseId)) byCase.set(f.caseId, []);
    byCase.get(f.caseId).push(f);
  }
  const known = [];
  for (const [id, fs] of [...byCase.entries()].sort((a, c) => (a[0] < c[0] ? -1 : 1))) {
    const scored = fs.filter((f) => !isApiError(f));
    if (!scored.length) {
      known.push({ state: 'error', id, findings: fs });
    } else {
      const crit = scored.filter(isCritical);
      known.push({ state: crit.length ? 'critical' : 'failed', id, findings: [...crit, ...scored.filter((f) => !isCritical(f))] });
    }
  }
  const failedScored = known.filter((c) => c.state !== 'error').length;
  const errors = known.filter((c) => c.state === 'error').length;
  let passed = b.casesTested - failedScored;
  let unknown = b.casesTotal - b.casesTested - errors;
  if (passed < 0 || unknown < 0) { // report is inconsistent: show what we cannot place as unknown
    passed = Math.max(0, passed);
    unknown = Math.max(0, b.casesTotal - known.length - passed);
  }
  const cells = [...known];
  for (let i = 0; i < passed; i++) cells.push({ state: 'passed' });
  for (let i = 0; i < unknown; i++) cells.push({ state: 'unknown' });
  return { cells, passed, unknown, errors, failed: failedScored, critical: known.filter((c) => c.state === 'critical').length };
}

const findingKey = (f) => `${f.caseId}/${f.dimension}`;
export const caseHref = (f) => `#case/${encodeURIComponent(f.caseId)}/${encodeURIComponent(f.dimension)}`;

function cellHtml(c, opts = {}) {
  if (c.state === 'passed') return '<span class="cell c-passed" title="Passed every check. The report lists failures only, so this claim\'s ID is not shown."></span>';
  if (c.state === 'unknown') return '<span class="cell c-unknown" title="Result not in the report"></span>';
  const f = c.findings[0];
  const what = c.state === 'error' ? 'not tested, the model call failed' : c.findings.map((x) => ruleText(x.ruleViolated)).join('; ');
  const label = `${c.id}, ${c.state === 'critical' ? 'critical: ' : c.state === 'failed' ? 'failed: ' : ''}${what}`;
  const hl = opts.highlight && opts.highlight === c.id ? ' hl' : '';
  if (opts.mini) return `<span class="cell c-${c.state}${hl}" title="${esc(label)}"></span>`;
  return `<a class="cell c-${c.state}${hl}" href="${caseHref(f)}" data-key="${esc(findingKey(f))}" aria-label="${esc(label)}"></a>`;
}

/** Cells only (used in the Overview lattice and the Batches rows). */
export function cellsHtml(model, opts) {
  return model.cells.map((c) => cellHtml(c, opts)).join('');
}

/** A small, non-interactive lattice for one batch, optionally marking one case. */
export function miniLattice(model, highlight, label) {
  return `<span class="mini" role="img" aria-label="${esc(label || 'Batch cells')}">${cellsHtml(model, { mini: true, highlight })}</span>`;
}

export function cellSummary(b, m) {
  const parts = [`${b.casesTotal} claims`, `${m.passed} passed`];
  if (m.failed) parts.push(`${m.failed} failed (${m.critical} critical)`);
  if (m.errors) parts.push(`${m.errors} not tested`);
  if (m.unknown) parts.push(`${m.unknown} unknown`);
  return `${batchName(b.batch)}: ${parts.join(', ')}`;
}

export function legendHtml() {
  return `<div class="legend" aria-label="Lattice key">
    <span data-k="passed"><i class="cell c-passed"></i>Passed</span>
    <span data-k="failed"><i class="cell c-failed"></i>Failed a check</span>
    <span data-k="critical"><i class="cell c-critical"></i>Critical: possible wrong payout</span>
    <span data-k="error"><i class="cell c-error"></i>Not tested (API error)</span>
    <span data-k="unknown"><i class="cell c-unknown"></i>Unknown</span>
  </div>`;
}
