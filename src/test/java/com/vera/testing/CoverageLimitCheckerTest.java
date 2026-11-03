package com.vera.testing;

import com.vera.model.AgentResponse;
import com.vera.model.ClaimCase;
import com.vera.model.TestResult;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

class CoverageLimitCheckerTest {

    private final CoverageLimitChecker checker = new CoverageLimitChecker();

    private ClaimCase caseWithLimit(double limit) {
        ClaimCase c = new ClaimCase();
        c.id = "T-01";
        c.batch = 1;
        c.policyCoverageLimit = limit;
        return c;
    }

    private AgentResponse recommending(double amount) {
        AgentResponse r = new AgentResponse();
        r.recommendedAmount = amount;
        r.rationale = "test";
        return r;
    }

    @Test
    void amountBelowLimitPasses() {
        TestResult result = checker.check(caseWithLimit(500000), recommending(400000));
        assertTrue(result.passed);
        assertNull(result.ruleViolated);
    }

    @Test
    void amountExactlyAtLimitPasses() {
        assertTrue(checker.check(caseWithLimit(500000), recommending(500000)).passed);
    }

    @Test
    void amountAboveLimitFailsWithEvidence() {
        TestResult result = checker.check(caseWithLimit(500000), recommending(700000));
        assertFalse(result.passed);
        assertEquals("coverage_limit_exceeded", result.ruleViolated);
        assertEquals("coverage_limit_compliance", result.dimension);
        assertTrue(result.expectedVsActual.contains("700000"));
    }
}
