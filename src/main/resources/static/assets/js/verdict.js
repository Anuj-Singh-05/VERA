// One definition of "needs a person's decision", shared by the verdict sentence, the key figure,
// the status chips and the Approve/Reject buttons.
//
// Rule (CertificationService.java, README "Status per batch"): NEEDS_HUMAN_REVIEW and BLOCKED both
// wait for a human approve/reject. The server lists those batches in report.pendingHumanReview
// until a decision is recorded. The UI never derives its own list: it uses pendingHumanReview and
// checks it against the batch statuses (consistencyProblems) so the two cannot drift apart silently.

export const DECISION_STATUSES = new Set(['NEEDS_HUMAN_REVIEW', 'BLOCKED']);

/** Batch numbers waiting for a person, exactly as the server reports them. */
export const pendingBatches = (r) => (r && Array.isArray(r.pendingHumanReview) ? r.pendingHumanReview.slice().sort((a, b) => a - b) : []);

export const isPending = (r, batch) => pendingBatches(r).includes(batch);

/** Returns a list of human-readable problems when the report contradicts the decision rule. */
export function consistencyProblems(r) {
  const problems = [];
  if (!r || !Array.isArray(r.batches)) return problems;
  const pending = new Set(pendingBatches(r));
  for (const b of r.batches) {
    const expected = DECISION_STATUSES.has(b.autoStatus) && !b.humanOverridden;
    if (expected && !pending.has(b.batch)) problems.push(`Batch ${b.batch} is ${b.autoStatus} with no decision, but is not listed as waiting for one.`);
    if (!expected && pending.has(b.batch)) problems.push(`Batch ${b.batch} is listed as waiting for a decision, but its status is ${b.autoStatus}${b.humanOverridden ? ' and a reviewer already decided' : ''}.`);
  }
  for (const n of pending) if (!r.batches.some((b) => b.batch === n)) problems.push(`Batch ${n} is listed as waiting for a decision but is not in the report.`);
  return problems;
}

const WORDS = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
const w = (n) => WORDS[n] || String(n);
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

/** Counts used by every summary on the page. */
export function tally(r) {
  const t = { total: r.batches.length, certified: 0, approved: 0, rejected: 0, pending: 0, pendingBlocked: 0, pendingReview: 0, unscored: 0 };
  const pending = new Set(pendingBatches(r));
  for (const b of r.batches) {
    if (b.finalStatus === 'CERTIFIED') t.certified++;
    if (b.humanOverridden && b.finalStatus === 'CERTIFIED') t.approved++;
    if (b.humanOverridden && b.finalStatus === 'BLOCKED') t.rejected++;
    if (b.finalStatus === 'INCOMPLETE' || b.finalStatus === 'NO_DATA') t.unscored++;
    if (pending.has(b.batch)) {
      t.pending++;
      if (b.autoStatus === 'BLOCKED') t.pendingBlocked++; else t.pendingReview++;
    }
  }
  return t;
}

/**
 * The verdict: one plain sentence plus the run-level status.
 * Run status: BLOCKED if any batch is finally blocked, INCOMPLETE if any could not be scored,
 * NEEDS_HUMAN_REVIEW while any decision is pending, otherwise CERTIFIED.
 */
export function verdictOf(r) {
  const t = tally(r);
  const parts = [];
  if (t.certified === t.total) {
    parts.push(`All ${w(t.total)} batches are certified${t.approved ? `, ${w(t.approved)} after a reviewer's approval` : ''}.`);
  } else {
    parts.push(`${cap(w(t.certified))} of ${w(t.total)} batches certified${t.approved ? ` (${w(t.approved)} approved by a reviewer)` : ''}.`);
  }
  if (t.pending) {
    const why = [];
    if (t.pendingBlocked) why.push(`${w(t.pendingBlocked)} blocked`);
    if (t.pendingReview) why.push(`${w(t.pendingReview)} below the 90% line or with a critical failure`);
    parts.push(`${cap(w(t.pending))} need${t.pending === 1 ? 's' : ''} a person's decision: ${why.join(', ')}.`);
  }
  if (t.rejected) parts.push(`${cap(w(t.rejected))} rejected by a reviewer.`);
  if (t.unscored) parts.push(`${cap(w(t.unscored))} could not be scored.`);

  const finals = r.batches.map((b) => b.finalStatus);
  const status = finals.includes('BLOCKED') ? 'BLOCKED'
    : finals.some((s) => s === 'INCOMPLETE' || s === 'NO_DATA') ? 'INCOMPLETE'
      : t.pending ? 'NEEDS_HUMAN_REVIEW' : 'CERTIFIED';
  return { status, text: parts.join(' '), tally: t };
}
