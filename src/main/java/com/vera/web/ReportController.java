package com.vera.web;

import com.vera.agent.ClaimsAgentService;
import com.vera.history.DriftMonitor;
import com.vera.history.RunHistoryStore;
import com.vera.history.RunRecord;
import com.vera.model.TestResult;
import com.vera.report.CertificationService;
import com.vera.report.VeraReport;
import com.vera.testing.BatchRunner;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "*")
public class ReportController {

    private final BatchRunner batchRunner;
    private final CertificationService certificationService;
    private final ClaimsAgentService agentService;
    private final RunHistoryStore historyStore;
    private final DriftMonitor driftMonitor;

    public ReportController(BatchRunner batchRunner,
                            CertificationService certificationService,
                            ClaimsAgentService agentService,
                            RunHistoryStore historyStore,
                            DriftMonitor driftMonitor) {
        this.batchRunner = batchRunner;
        this.certificationService = certificationService;
        this.agentService = agentService;
        this.historyStore = historyStore;
        this.driftMonitor = driftMonitor;
    }

    /**
     * Runs every synthetic claim through the agent-under-test and all checkers,
     * compares the result with the previous comparable run (drift), and
     * persists it to the run history.
     */
    @PostMapping("/run")
    public VeraReport runTests() throws Exception {
        certificationService.clearOverrides();
        List<TestResult> results = batchRunner.runAll();
        VeraReport report = withRunInfo(certificationService.buildReport(results));

        RunRecord previous = historyStore.lastComparable(report.provider, report.model, report.promptVersion);
        report.driftAlerts = driftMonitor.compare(report.batches, previous);

        RunRecord saved = historyStore.recordRun(report);
        report.runNumber = saved.runNumber;
        report.timestamp = saved.timestamp;
        return report;
    }

    /** Returns the report from the most recent run, without re-running anything. */
    @GetMapping("/report")
    public VeraReport getReport() {
        VeraReport report = withRunInfo(certificationService.buildReport(batchRunner.getResults()));
        RunRecord latest = historyStore.latest();
        if (latest != null && batchRunner.hasRun()) {
            report.runNumber = latest.runNumber;
            report.timestamp = latest.timestamp;
            report.driftAlerts = latest.driftAlerts;
        }
        return report;
    }

    /** Full persisted run history, oldest first (used for the run-over-run drift chart). */
    @GetMapping("/runs")
    public List<RunRecord> getRuns() {
        return historyStore.getRuns();
    }

    private VeraReport withRunInfo(VeraReport report) {
        report.provider = agentService.getProvider();
        report.model = agentService.getModel();
        report.promptVersion = agentService.getPromptVersion();
        return report;
    }
}
