// Front-end rule check: the verdict sentence, the "awaiting a decision" figure and the
// Approve/Reject buttons must all agree with report.pendingHumanReview.
// Run: node --test src/test/js/   (Node 18+, no packages needed)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { verdictOf, tally, pendingBatches, consistencyProblems, isPending } from '../../main/resources/static/assets/js/verdict.js';

const batch = (n, auto, final = auto, over = false) => ({ batch: n, autoStatus: auto, finalStatus: final, humanOverridden: over, overallPassRate: 1, casesTotal: 8, casesTested: 8 });

// Shape and statuses of the default mock run (failures 0,2,5,5,0), as returned by POST /api/run.
const mock = () => ({
  batches: [batch(1, 'CERTIFIED'), batch(2, 'NEEDS_HUMAN_REVIEW'), batch(3, 'BLOCKED'), batch(4, 'NEEDS_HUMAN_REVIEW'), batch(5, 'CERTIFIED')],
  pendingHumanReview: [2, 3, 4],
});

test('blocked batches count as waiting for a decision, like NEEDS_HUMAN_REVIEW', () => {
  const r = mock();
  const t = tally(r);
  assert.equal(t.pending, 3);
  assert.equal(t.pendingBlocked, 1);
  assert.equal(t.pendingReview, 2);
  assert.ok(isPending(r, 3), 'blocked batch 3 offers Approve/Reject');
  assert.deepEqual(consistencyProblems(r), []);
});

test('the verdict sentence states the same number as the figure', () => {
  const r = mock();
  const v = verdictOf(r);
  assert.match(v.text, /^Two of five batches certified\. Three need a person's decision: one blocked/);
  assert.equal(v.tally.pending, pendingBatches(r).length);
  assert.equal(v.status, 'BLOCKED');
});

test('after approving batch 3 it leaves the pending list and the sentence says so', () => {
  const r = mock();
  r.batches[2] = batch(3, 'BLOCKED', 'CERTIFIED', true);
  r.pendingHumanReview = [2, 4];
  const v = verdictOf(r);
  assert.deepEqual(consistencyProblems(r), []);
  assert.match(v.text, /Three of five batches certified \(one approved by a reviewer\)\. Two need a person's decision/);
  assert.equal(v.status, 'NEEDS_HUMAN_REVIEW');
});

test('a rejected batch is reported as rejected, not pending', () => {
  const r = mock();
  r.batches[1] = batch(2, 'NEEDS_HUMAN_REVIEW', 'BLOCKED', true);
  r.pendingHumanReview = [3, 4];
  const v = verdictOf(r);
  assert.deepEqual(consistencyProblems(r), []);
  assert.match(v.text, /One rejected by a reviewer\./);
});

test('nothing certified reads as a sentence', () => {
  const r = { batches: [1, 2, 3, 4, 5].map((n) => batch(n, 'BLOCKED')), pendingHumanReview: [1, 2, 3, 4, 5] };
  assert.match(verdictOf(r).text, /^None of the five batches is certified\. Five need a person's decision: five blocked\.$/);
});

test('all certified', () => {
  const r = { batches: [1, 2, 3, 4, 5].map((n) => batch(n, 'CERTIFIED')), pendingHumanReview: [] };
  const v = verdictOf(r);
  assert.equal(v.text, 'All five batches are certified.');
  assert.equal(v.status, 'CERTIFIED');
});

test('a mismatch between statuses and the pending list is detected', () => {
  const r = mock();
  r.pendingHumanReview = [2, 4]; // batch 3 is BLOCKED but missing
  assert.equal(consistencyProblems(r).length, 1);
  r.pendingHumanReview = [1, 2, 3, 4]; // batch 1 is CERTIFIED but listed
  assert.equal(consistencyProblems(r).length, 1);
});

test('incomplete and no-data batches are not offered for decision and are named', () => {
  const r = { batches: [batch(1, 'CERTIFIED'), batch(2, 'INCOMPLETE'), batch(3, 'NO_DATA')], pendingHumanReview: [] };
  const v = verdictOf(r);
  assert.deepEqual(consistencyProblems(r), []);
  assert.match(v.text, /Two could not be scored\./);
  assert.equal(v.status, 'INCOMPLETE');
});
