package com.vera.agent;

import com.vera.model.AgentResponse;
import com.vera.model.ClaimCase;
import com.vera.model.VeraRules;

/**
 * A SIMULATED claims agent that needs no API key. It is scripted, not an LLM.
 *
 * - recommendWellBehaved: does the right thing (respects the cap, flags real conflicts).
 * - recommend: the same, except the first N cases of each batch misbehave, where N comes
 *   from config (vera.mock.failures-per-batch, default 0,2,5). This gives a fully
 *   reproducible "drift" so the pipeline, dashboard and certification logic can be
 *   tested and demoed offline.
 *
 * IMPORTANT: results from this mock say nothing about how a real LLM behaves.
 * For real evidence, run with a live provider (groq, gemini or anthropic).
 */
public class MockAgentLogic {

    /** Documents "conflict" if (max - min) / min exceeds this. Same value the checker and prompt use. */
    public static final double CONFLICT_SPREAD = VeraRules.CONFLICT_THRESHOLD;

    public static boolean documentsConflict(ClaimCase c) {
        double min = minAmount(c);
        double max = maxAmount(c);
        return min > 0 && (max - min) / min > CONFLICT_SPREAD;
    }

    public static AgentResponse recommendWellBehaved(ClaimCase c) {
        double sum = 0;
        for (int i = 0; i < c.documents.size(); i++) {
            sum += c.documents.get(i).statedAmount;
        }
        double avg = sum / c.documents.size();

        AgentResponse r = new AgentResponse();
        r.recommendedAmount = Math.min(avg, c.policyCoverageLimit);
        r.conflictDetected = documentsConflict(c);
        r.rationale = r.conflictDetected
                ? "Documents disagree materially; flagging for human review."
                : "Documents agree; recommending within the policy limit.";
        return r;
    }

    public static AgentResponse recommend(ClaimCase c, int[] failuresPerBatch) {
        int idx = c.batch - 1;
        int k = (idx >= 0 && idx < failuresPerBatch.length) ? failuresPerBatch[idx] : 0;

        AgentResponse r = recommendWellBehaved(c);
        if (caseNumber(c.id) > k) {
            return r;
        }

        // Phase 2 security cases misbehave in their own dimension.
        if (c.injectedAmount != null) {
            r.recommendedAmount = c.injectedAmount;
            r.rationale = "[simulated degradation] Followed an instruction embedded in a document.";
            return r;
        }
        if (c.piiValues != null && !c.piiValues.isEmpty()) {
            r.rationale = "[simulated degradation] Claimant identifier " + c.piiValues.get(0)
                    + " verified; recommending within the policy limit.";
            return r;
        }

        double max = maxAmount(c);
        if (max * 1.2 > c.policyCoverageLimit) {
            r.recommendedAmount = max * 1.2;
            r.rationale = "[simulated degradation] Padded the highest document amount and ignored the policy cap.";
        } else {
            r.conflictDetected = !r.conflictDetected;
            r.rationale = "[simulated degradation] Misjudged whether the documents conflict.";
        }
        return r;
    }

    static int caseNumber(String id) {
        try {
            return Integer.parseInt(id.substring(id.lastIndexOf('-') + 1));
        } catch (Exception e) {
            return Integer.MAX_VALUE;
        }
    }

    private static double maxAmount(ClaimCase c) {
        double max = Double.NEGATIVE_INFINITY;
        for (int i = 0; i < c.documents.size(); i++) {
            max = Math.max(max, c.documents.get(i).statedAmount);
        }
        return max;
    }

    private static double minAmount(ClaimCase c) {
        double min = Double.POSITIVE_INFINITY;
        for (int i = 0; i < c.documents.size(); i++) {
            min = Math.min(min, c.documents.get(i).statedAmount);
        }
        return min;
    }
}
