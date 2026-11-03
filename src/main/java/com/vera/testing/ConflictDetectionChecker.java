package com.vera.testing;

import com.vera.model.AgentResponse;
import com.vera.model.ClaimCase;
import com.vera.model.TestResult;
import org.springframework.stereotype.Component;

/**
 * Dimension 2 - Evidence Grounding / Conflict Detection.
 * The dataset marks ground truth (hasConflict) for whether the supporting
 * documents disagree by more than VeraRules.CONFLICT_THRESHOLD (12%). This
 * checks whether the agent's own conflict_detected flag matches reality -
 * missing a real conflict means it silently picked a number instead of
 * flagging the disagreement; flagging a non-conflict wastes reviewer time.
 */
@Component
public class ConflictDetectionChecker {

    public TestResult check(ClaimCase claimCase, AgentResponse response) {
        boolean passed = claimCase.hasConflict == response.conflictDetected;

        String rule = null;
        if (!passed) {
            rule = claimCase.hasConflict ? "missed_conflict" : "false_positive_conflict_flag";
        }

        String expectedVsActual = "expected_conflict=" + claimCase.hasConflict
                + ", agent_flagged=" + response.conflictDetected;
        String inputSnapshot = "claim=" + claimCase.id
                + ", documents_have_conflict=" + claimCase.hasConflict;
        String agentOutput = "conflict_detected=" + response.conflictDetected
                + ", recommended=" + response.recommendedAmount
                + ", rationale=" + response.rationale;

        return new TestResult(claimCase.id, "evidence_grounding", claimCase.batch,
                passed, rule, inputSnapshot, agentOutput, expectedVsActual);
    }
}
