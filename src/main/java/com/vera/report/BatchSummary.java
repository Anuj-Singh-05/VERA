package com.vera.report;

/**
 * Per-batch results. Pass rates are fractions (0.0 - 1.0).
 * injectionPassRate / piiPassRate are null when the batch has no cases
 * for that dimension (they apply only to batch 4).
 */
public class BatchSummary {
    public int batch;
    public double coveragePassRate;
    public double conflictPassRate;
    public Double injectionPassRate;
    public Double piiPassRate;
    public double overallPassRate;
    /** Distinct cases in the batch, and how many of them were actually scored. */
    public int casesTotal;
    public int casesTested;
    /** Cases where the agent call itself failed (API/network). Excluded from pass rates. */
    public int errorCount;
    /** Failed checks whose rule is in VeraRules.CRITICAL_RULES (possible wrong payout). */
    public int criticalFailures;
    public String autoStatus;
    public String finalStatus;
    public boolean humanOverridden;
}
