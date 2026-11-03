package com.vera.history;

import com.vera.report.BatchSummary;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class DriftMonitorTest {

    private BatchSummary batch(int n, double rate, String status) {
        BatchSummary b = new BatchSummary();
        b.batch = n;
        b.overallPassRate = rate;
        b.autoStatus = status;
        return b;
    }

    private RunRecord previous(BatchSummary... batches) {
        RunRecord r = new RunRecord();
        r.runNumber = 1;
        r.batches = List.of(batches);
        return r;
    }

    @Test
    void largeDropAndLostCertificationRaiseAlerts() {
        DriftMonitor monitor = new DriftMonitor(10);
        List<String> alerts = monitor.compare(List.of(batch(2, 0.75, "NEEDS_HUMAN_REVIEW")),
                previous(batch(2, 1.0, "CERTIFIED")));
        assertEquals(2, alerts.size());
        assertTrue(alerts.get(0).contains("Batch 2"));
    }

    @Test
    void smallDropFirstRunAndIncompleteBatchesRaiseNothing() {
        DriftMonitor monitor = new DriftMonitor(10);
        assertTrue(monitor.compare(List.of(batch(1, 0.95, "CERTIFIED")),
                previous(batch(1, 1.0, "CERTIFIED"))).isEmpty());
        assertTrue(monitor.compare(List.of(batch(1, 0.5, "BLOCKED")), null).isEmpty());
        assertTrue(monitor.compare(List.of(batch(1, 0.5, "INCOMPLETE")),
                previous(batch(1, 1.0, "CERTIFIED"))).isEmpty());
    }
}
