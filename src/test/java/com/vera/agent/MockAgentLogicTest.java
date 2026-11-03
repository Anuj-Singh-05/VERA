package com.vera.agent;

import com.vera.data.DatasetLoader;
import com.vera.model.AgentResponse;
import com.vera.model.ClaimCase;
import com.vera.model.TestResult;
import com.vera.testing.ConflictDetectionChecker;
import com.vera.testing.CoverageLimitChecker;
import com.vera.testing.PiiProtectionChecker;
import com.vera.testing.PromptInjectionChecker;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class MockAgentLogicTest {

    private final CoverageLimitChecker coverage = new CoverageLimitChecker();
    private final ConflictDetectionChecker conflict = new ConflictDetectionChecker();
    private final PromptInjectionChecker injection = new PromptInjectionChecker();
    private final PiiProtectionChecker pii = new PiiProtectionChecker();

    private List<ClaimCase> cases() throws Exception {
        return new DatasetLoader().loadDataset();
    }

    private List<TestResult> allChecks(ClaimCase c, AgentResponse r) {
        List<TestResult> out = new ArrayList<>();
        out.add(coverage.check(c, r));
        out.add(conflict.check(c, r));
        TestResult i = injection.check(c, r);
        if (i != null) out.add(i);
        TestResult p = pii.check(c, r);
        if (p != null) out.add(p);
        return out;
    }

    @Test
    void wellBehavedAgentPassesEveryCheck() throws Exception {
        for (ClaimCase c : cases()) {
            AgentResponse r = MockAgentLogic.recommendWellBehaved(c);
            for (TestResult t : allChecks(c, r)) {
                assertTrue(t.passed, c.id + " " + t.dimension);
            }
        }
    }

    @Test
    void scriptedDegradationProducesTheConfiguredFailureCounts() throws Exception {
        int[] failuresPerBatch = {0, 2, 5, 5, 0};
        int[] observed = new int[5];
        for (ClaimCase c : cases()) {
            AgentResponse r = MockAgentLogic.recommend(c, failuresPerBatch);
            for (TestResult t : allChecks(c, r)) {
                if (!t.passed) observed[c.batch - 1]++;
            }
        }
        assertEquals(0, observed[0]);
        assertEquals(2, observed[1]);
        assertEquals(5, observed[2]);
        assertEquals(5, observed[3]);
        assertEquals(0, observed[4]);
    }

    @Test
    void zeroFailuresConfigBehavesLikeTheWellBehavedAgent() throws Exception {
        int[] none = {0, 0, 0, 0, 0};
        for (ClaimCase c : cases()) {
            AgentResponse a = MockAgentLogic.recommend(c, none);
            AgentResponse b = MockAgentLogic.recommendWellBehaved(c);
            assertEquals(b.recommendedAmount, a.recommendedAmount, 0.0001);
            assertEquals(b.conflictDetected, a.conflictDetected);
        }
    }
}
