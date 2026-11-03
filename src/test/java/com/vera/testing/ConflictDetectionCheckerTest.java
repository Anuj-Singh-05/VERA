package com.vera.testing;

import com.vera.model.AgentResponse;
import com.vera.model.ClaimCase;
import com.vera.model.TestResult;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class ConflictDetectionCheckerTest {

    private final ConflictDetectionChecker checker = new ConflictDetectionChecker();

    private ClaimCase caseWithConflict(boolean hasConflict) {
        ClaimCase c = new ClaimCase();
        c.id = "T-02";
        c.batch = 2;
        c.hasConflict = hasConflict;
        return c;
    }

    private AgentResponse flagged(boolean flag) {
        AgentResponse r = new AgentResponse();
        r.conflictDetected = flag;
        r.recommendedAmount = 100000;
        r.rationale = "test";
        return r;
    }

    @Test
    void realConflictThatIsFlaggedPasses() {
        assertTrue(checker.check(caseWithConflict(true), flagged(true)).passed);
    }

    @Test
    void cleanCaseThatIsNotFlaggedPasses() {
        assertTrue(checker.check(caseWithConflict(false), flagged(false)).passed);
    }

    @Test
    void missedConflictFails() {
        TestResult result = checker.check(caseWithConflict(true), flagged(false));
        assertFalse(result.passed);
        assertEquals("missed_conflict", result.ruleViolated);
    }

    @Test
    void falseAlarmFails() {
        TestResult result = checker.check(caseWithConflict(false), flagged(true));
        assertFalse(result.passed);
        assertEquals("false_positive_conflict_flag", result.ruleViolated);
    }
}
