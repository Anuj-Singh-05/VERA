package com.vera.history;

import com.vera.report.BatchSummary;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

/**
 * Real (run-over-run) drift detection. Compares each batch of the current run
 * with the same batch of the previous comparable run (same provider, model and
 * prompt version). Raises an alert, with the evidence, when the overall pass
 * rate falls by more than vera.drift.alert-points percentage points, or when a
 * batch that was CERTIFIED is no longer CERTIFIED.
 *
 * Batches with status NO_DATA or INCOMPLETE are not compared: too few cases
 * were scored for a drop to be meaningful.
 */
@Component
public class DriftMonitor {

    private final double alertPoints;

    public DriftMonitor(@Value("${vera.drift.alert-points:10}") double alertPoints) {
        this.alertPoints = alertPoints;
    }

    public List<String> compare(List<BatchSummary> current, RunRecord previous) {
        List<String> alerts = new ArrayList<>();
        if (previous == null) {
            return alerts;
        }
        for (BatchSummary now : current) {
            BatchSummary before = find(previous.batches, now.batch);
            if (before == null || !comparable(now) || !comparable(before)) {
                continue;
            }
            double drop = (before.overallPassRate - now.overallPassRate) * 100.0;
            if (drop > alertPoints) {
                alerts.add(String.format("Batch %d overall pass rate fell %.1f points (%.1f%% -> %.1f%%) since run #%d",
                        now.batch, drop, before.overallPassRate * 100, now.overallPassRate * 100, previous.runNumber));
            }
            if ("CERTIFIED".equals(before.autoStatus) && !"CERTIFIED".equals(now.autoStatus)) {
                alerts.add(String.format("Batch %d lost certification: CERTIFIED in run #%d, now %s",
                        now.batch, previous.runNumber, now.autoStatus));
            }
        }
        return alerts;
    }

    private static boolean comparable(BatchSummary b) {
        return !"NO_DATA".equals(b.autoStatus) && !"INCOMPLETE".equals(b.autoStatus);
    }

    private static BatchSummary find(List<BatchSummary> list, int batch) {
        if (list == null) return null;
        for (BatchSummary b : list) {
            if (b.batch == batch) return b;
        }
        return null;
    }
}
