package com.vera.report;

import com.vera.model.TestResult;

import java.util.ArrayList;
import java.util.List;

public class VeraReport {
    /** Which agent produced these results: mock, groq, gemini or anthropic. */
    public String provider;
    public String model;
    public String promptVersion;
    /** Sequence number of this run in the persisted run history (0 if not persisted). */
    public int runNumber;
    public String timestamp;
    public List<BatchSummary> batches = new ArrayList<>();
    public List<TestResult> failedCases = new ArrayList<>();
    public List<Integer> pendingHumanReview = new ArrayList<>();
    /** Drift alerts raised by comparing this run with the previous comparable run. */
    public List<String> driftAlerts = new ArrayList<>();
}
