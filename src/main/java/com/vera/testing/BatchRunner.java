package com.vera.testing;

import com.vera.agent.ClaimsAgentService;
import com.vera.data.DatasetLoader;
import com.vera.model.AgentResponse;
import com.vera.model.ClaimCase;
import com.vera.model.TestResult;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;

/**
 * Runs the full synthetic dataset through the agent-under-test and every
 * applicable checker, storing every TestResult.
 *
 * Batches 1-3 are difficulty tiers (clean, near-limit, adversarial evidence);
 * batch 4 holds the Phase 2 security cases (prompt injection, PII). Comparing
 * pass rates across batches shows how reliability changes with difficulty;
 * comparing runs over time (RunHistoryStore + DriftMonitor) is the real
 * drift signal.
 */
@Service
public class BatchRunner {

    private final ClaimsAgentService agentService;
    private final DatasetLoader datasetLoader;
    private final CoverageLimitChecker coverageLimitChecker;
    private final ConflictDetectionChecker conflictDetectionChecker;
    private final PromptInjectionChecker promptInjectionChecker;
    private final PiiProtectionChecker piiProtectionChecker;

    @Value("${vera.live.pause-ms:7000}")
    private long livePauseMs;

    private final List<TestResult> allResults = new CopyOnWriteArrayList<>();
    private boolean hasRun = false;

    public BatchRunner(ClaimsAgentService agentService,
                       DatasetLoader datasetLoader,
                       CoverageLimitChecker coverageLimitChecker,
                       ConflictDetectionChecker conflictDetectionChecker,
                       PromptInjectionChecker promptInjectionChecker,
                       PiiProtectionChecker piiProtectionChecker) {
        this.agentService = agentService;
        this.datasetLoader = datasetLoader;
        this.coverageLimitChecker = coverageLimitChecker;
        this.conflictDetectionChecker = conflictDetectionChecker;
        this.promptInjectionChecker = promptInjectionChecker;
        this.piiProtectionChecker = piiProtectionChecker;
    }

    public synchronized List<TestResult> runAll() throws Exception {
        allResults.clear();
        List<ClaimCase> cases = datasetLoader.loadDataset();
        boolean live = !agentService.getProvider().equals("mock");

        for (int i = 0; i < cases.size(); i++) {
            ClaimCase c = cases.get(i);
            try {
                AgentResponse response = agentService.getRecommendation(c);
                allResults.add(coverageLimitChecker.check(c, response));
                allResults.add(conflictDetectionChecker.check(c, response));
                addIfApplicable(promptInjectionChecker.check(c, response));
                addIfApplicable(piiProtectionChecker.check(c, response));
            } catch (Exception e) {
                allResults.add(new TestResult(c.id, "agent_call_error", c.batch, false,
                        "llm_call_failed", "claim=" + c.id, "ERROR: " + e.getMessage(), "n/a"));
            }

            // Pace live calls (also after a failed call) so the run stays under
            // free-tier tokens-per-minute limits. The mock needs no pause.
            if (live && i < cases.size() - 1) {
                try {
                    Thread.sleep(livePauseMs);
                } catch (InterruptedException ie) {
                    Thread.currentThread().interrupt();
                    break;
                }
            }
        }

        hasRun = true;
        return allResults;
    }

    private void addIfApplicable(TestResult r) {
        if (r != null) {
            allResults.add(r);
        }
    }

    public List<TestResult> getResults() {
        return allResults;
    }

    public boolean hasRun() {
        return hasRun;
    }
}
