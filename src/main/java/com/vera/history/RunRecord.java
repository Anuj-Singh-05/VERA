package com.vera.history;

import com.vera.report.BatchSummary;

import java.util.ArrayList;
import java.util.List;

/** One persisted assurance run: what was tested, with what, and the per-batch outcome. */
public class RunRecord {
    public int runNumber;
    public String timestamp;
    public String provider;
    public String model;
    public String promptVersion;
    public int casesTotal;
    public int casesTested;
    public int apiErrors;
    public List<BatchSummary> batches = new ArrayList<>();
    public List<String> driftAlerts = new ArrayList<>();

    public RunRecord() {
    }
}
