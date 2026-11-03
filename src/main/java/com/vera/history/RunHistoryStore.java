package com.vera.history;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.vera.report.BatchSummary;
import com.vera.report.VeraReport;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.io.File;
import java.io.IOException;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

/**
 * File-based persistence for run history and human review decisions.
 * Stored as JSON under vera.history.dir (default ./vera-data) so results and
 * the review audit trail survive application restarts. No database server or
 * extra dependency is needed; Jackson is already on the classpath.
 */
@Component
public class RunHistoryStore {

    private final ObjectMapper mapper = new ObjectMapper().enable(SerializationFeature.INDENT_OUTPUT);
    private final File runsFile;
    private final File reviewsFile;
    private final List<RunRecord> runs = new ArrayList<>();
    private final List<ReviewRecord> reviews = new ArrayList<>();

    public RunHistoryStore(@Value("${vera.history.dir:vera-data}") String dir) {
        File folder = new File(dir);
        if (!folder.exists() && !folder.mkdirs()) {
            throw new IllegalStateException("Cannot create history folder " + folder.getAbsolutePath());
        }
        this.runsFile = new File(folder, "run-history.json");
        this.reviewsFile = new File(folder, "review-log.json");
        runs.addAll(read(runsFile, RunRecord[].class));
        reviews.addAll(read(reviewsFile, ReviewRecord[].class));
    }

    /** Builds a RunRecord from a report, appends it and saves to disk. */
    public synchronized RunRecord recordRun(VeraReport report) {
        RunRecord rec = new RunRecord();
        rec.runNumber = runs.isEmpty() ? 1 : runs.get(runs.size() - 1).runNumber + 1;
        rec.timestamp = Instant.now().toString();
        rec.provider = report.provider;
        rec.model = report.model;
        rec.promptVersion = report.promptVersion;
        for (BatchSummary b : report.batches) {
            rec.casesTotal += b.casesTotal;
            rec.casesTested += b.casesTested;
            rec.apiErrors += b.errorCount;
        }
        rec.batches = report.batches;
        rec.driftAlerts = report.driftAlerts;
        runs.add(rec);
        write(runsFile, runs);
        return rec;
    }

    public synchronized ReviewRecord recordReview(int batch, boolean approved, String reviewer, String reason) {
        ReviewRecord r = new ReviewRecord();
        r.runNumber = runs.isEmpty() ? 0 : runs.get(runs.size() - 1).runNumber;
        r.batch = batch;
        r.approved = approved;
        r.reviewer = reviewer;
        r.reason = reason;
        r.timestamp = Instant.now().toString();
        reviews.add(r);
        write(reviewsFile, reviews);
        return r;
    }

    /** Most recent earlier run with the same provider, model and prompt version, or null. */
    public synchronized RunRecord lastComparable(String provider, String model, String promptVersion) {
        for (int i = runs.size() - 1; i >= 0; i--) {
            RunRecord r = runs.get(i);
            if (eq(r.provider, provider) && eq(r.model, model) && eq(r.promptVersion, promptVersion)) {
                return r;
            }
        }
        return null;
    }

    public synchronized RunRecord latest() {
        return runs.isEmpty() ? null : runs.get(runs.size() - 1);
    }

    public synchronized List<RunRecord> getRuns() {
        return new ArrayList<>(runs);
    }

    public synchronized List<ReviewRecord> getReviews() {
        return new ArrayList<>(reviews);
    }

    private static boolean eq(String a, String b) {
        return a == null ? b == null : a.equals(b);
    }

    private <T> List<T> read(File file, Class<T[]> type) {
        if (!file.exists()) {
            return new ArrayList<>();
        }
        try {
            return new ArrayList<>(Arrays.asList(mapper.readValue(file, type)));
        } catch (IOException e) {
            throw new IllegalStateException("Corrupt history file " + file.getAbsolutePath(), e);
        }
    }

    private void write(File file, Object value) {
        try {
            mapper.writeValue(file, value);
        } catch (IOException e) {
            throw new IllegalStateException("Cannot write " + file.getAbsolutePath(), e);
        }
    }
}
