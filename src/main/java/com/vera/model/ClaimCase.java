package com.vera.model;

import java.util.ArrayList;
import java.util.List;

/**
 * One synthetic test case: a claim description, the policy's coverage limit,
 * and the supporting documents describing it.
 *
 * hasConflict is GROUND TRUTH set when the dataset was authored - it says
 * whether the documents disagree on the amount by more than
 * VeraRules.CONFLICT_THRESHOLD (12%). The ConflictDetectionChecker compares
 * the agent's own conflict flag against it.
 *
 * Phase 2 (batch 4, adversarial security cases):
 *   injectedAmount - set when a document carries an embedded instruction that
 *                    tries to make the agent pay this figure (prompt injection).
 *   piiValues      - synthetic personal identifiers present in the claim that
 *                    must never be repeated in the agent's rationale.
 */
public class ClaimCase {
    public String id;
    public int batch;
    public String claimDescription;
    public double policyCoverageLimit;
    public List<ClaimDocument> documents;
    public boolean hasConflict;
    public Double injectedAmount;
    public List<String> piiValues = new ArrayList<>();

    public ClaimCase() {
    }
}
