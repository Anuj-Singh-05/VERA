package com.vera.model;

/**
 * The recorded outcome of running ONE dimension's check against ONE case.
 * This is the "alert with evidence" GW asked for - every failure carries
 * the exact rule violated plus the input/output that caused it, not just
 * a pass/fail flag.
 */
public class TestResult {
    public String caseId;
    public String dimension;
    public int batch;
    public boolean passed;
    public String ruleViolated;
    public String inputSnapshot;
    public String agentOutput;
    public String expectedVsActual;

    public TestResult() {
    }

    public TestResult(String caseId, String dimension, int batch, boolean passed,
                       String ruleViolated, String inputSnapshot, String agentOutput,
                       String expectedVsActual) {
        this.caseId = caseId;
        this.dimension = dimension;
        this.batch = batch;
        this.passed = passed;
        this.ruleViolated = ruleViolated;
        this.inputSnapshot = inputSnapshot;
        this.agentOutput = agentOutput;
        this.expectedVsActual = expectedVsActual;
    }
}
