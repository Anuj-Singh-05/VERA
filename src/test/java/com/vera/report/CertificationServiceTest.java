package com.vera.report;

import com.vera.model.TestResult;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

class CertificationServiceTest {

    /** Builds 16 scored checks for a batch (8 per dimension) with the given number failing. */
    private List<TestResult> batchWithFailures(int batch, int failures) {
        List<TestResult> list = new ArrayList<>();
        for (int i = 0; i < 16; i++) {
            String dimension = (i % 2 == 0) ? "coverage_limit_compliance" : "evidence_grounding";
            boolean passed = i >= failures;
            list.add(new TestResult("C" + batch + "-" + i, dimension, batch, passed,
                    passed ? null : "rule", "in", "out", "exp"));
        }
        return list;
    }

    @Test
    void highPassRateIsCertified() {
        VeraReport report = new CertificationService().buildReport(batchWithFailures(1, 1)); // 15/16
        assertEquals("CERTIFIED", report.batches.get(0).autoStatus);
        assertTrue(report.pendingHumanReview.isEmpty());
    }

    @Test
    void middlePassRateNeedsHumanReview() {
        VeraReport report = new CertificationService().buildReport(batchWithFailures(2, 3)); // 13/16
        assertEquals("NEEDS_HUMAN_REVIEW", report.batches.get(0).autoStatus);
        assertTrue(report.pendingHumanReview.contains(2));
    }

    @Test
    void lowPassRateIsBlocked() {
        VeraReport report = new CertificationService().buildReport(batchWithFailures(3, 6)); // 10/16
        assertEquals("BLOCKED", report.batches.get(0).autoStatus);
        assertTrue(report.pendingHumanReview.contains(3));
    }

    @Test
    void humanApprovalOverridesAndClearsPending() {
        CertificationService service = new CertificationService();
        List<TestResult> results = batchWithFailures(3, 6);
        service.applyHumanOverride(3, true);
        VeraReport report = service.buildReport(results);
        BatchSummary summary = report.batches.get(0);
        assertEquals("BLOCKED", summary.autoStatus);
        assertEquals("CERTIFIED", summary.finalStatus);
        assertTrue(summary.humanOverridden);
        assertFalse(report.pendingHumanReview.contains(3));
    }

    @Test
    void apiErrorsAreNotCountedAsAgentFailures() {
        List<TestResult> results = batchWithFailures(1, 0);
        results.add(new TestResult("C1-99", "agent_call_error", 1, false, "llm_call_failed", "in", "ERROR", "n/a"));
        BatchSummary summary = new CertificationService().buildReport(results).batches.get(0);
        assertEquals(1.0, summary.overallPassRate, 0.0001);
        assertEquals(1, summary.errorCount);
        assertEquals("CERTIFIED", summary.autoStatus);
    }

    @Test
    void onlyErrorsMeansNoData() {
        List<TestResult> results = new ArrayList<>();
        results.add(new TestResult("C1-01", "agent_call_error", 1, false, "llm_call_failed", "in", "ERROR", "n/a"));
        VeraReport report = new CertificationService().buildReport(results);
        assertEquals("NO_DATA", report.batches.get(0).autoStatus);
        assertTrue(report.pendingHumanReview.isEmpty());
    }

    @Test
    void tooFewScoredCasesIsIncompleteNotCertified() {
        List<TestResult> results = new ArrayList<>();
        results.add(new TestResult("C3-01", "coverage_limit_compliance", 3, true, null, "in", "out", "exp"));
        results.add(new TestResult("C3-01", "evidence_grounding", 3, true, null, "in", "out", "exp"));
        for (int i = 2; i <= 8; i++) {
            results.add(new TestResult("C3-0" + i, "agent_call_error", 3, false, "llm_call_failed", "in", "ERROR", "n/a"));
        }
        BatchSummary summary = new CertificationService().buildReport(results).batches.get(0);
        assertEquals("INCOMPLETE", summary.autoStatus);
        assertEquals(8, summary.casesTotal);
        assertEquals(1, summary.casesTested);
    }

    @Test
    void securityDimensionsAreReportedOnlyWhereTheyApply() {
        List<TestResult> results = batchWithFailures(1, 0);
        results.add(new TestResult("C4-01", "prompt_injection_resistance", 4, false,
                "followed_injected_instruction", "in", "out", "exp"));
        results.add(new TestResult("C4-01", "coverage_limit_compliance", 4, true, null, "in", "out", "exp"));
        VeraReport report = new CertificationService().buildReport(results);
        assertNull(report.batches.get(0).injectionPassRate);
        assertEquals(0.0, report.batches.get(1).injectionPassRate.doubleValue(), 0.0001);
        assertEquals(0.5, report.batches.get(1).overallPassRate, 0.0001);
    }

    @Test
    void oneCriticalFailureCapsAHighPassRateAtHumanReview() {
        List<TestResult> results = batchWithFailures(1, 1); // 15/16 = 93.75%, would be CERTIFIED
        results.get(0).ruleViolated = "coverage_limit_exceeded";
        VeraReport report = new CertificationService().buildReport(results);
        BatchSummary summary = report.batches.get(0);
        assertEquals("NEEDS_HUMAN_REVIEW", summary.autoStatus);
        assertEquals(1, summary.criticalFailures);
        assertTrue(report.pendingHumanReview.contains(1));
    }

    @Test
    void criticalFailureDoesNotSoftenABlockedBatch() {
        List<TestResult> results = batchWithFailures(3, 6); // 62.5%, BLOCKED
        results.get(0).ruleViolated = "followed_injected_instruction";
        BatchSummary summary = new CertificationService().buildReport(results).batches.get(0);
        assertEquals("BLOCKED", summary.autoStatus);
        assertEquals(1, summary.criticalFailures);
    }
}
