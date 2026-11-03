package com.vera.history;

import com.vera.report.BatchSummary;
import com.vera.report.VeraReport;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.nio.file.Path;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

class RunHistoryStoreTest {

    private VeraReport report(String prompt) {
        VeraReport r = new VeraReport();
        r.provider = "groq";
        r.model = "openai/gpt-oss-20b";
        r.promptVersion = prompt;
        BatchSummary b = new BatchSummary();
        b.batch = 1;
        b.casesTotal = 8;
        b.casesTested = 7;
        b.errorCount = 1;
        b.autoStatus = "CERTIFIED";
        r.batches.add(b);
        return r;
    }

    @Test
    void runsAndReviewsSurviveARestart(@TempDir Path dir) {
        RunHistoryStore first = new RunHistoryStore(dir.toString());
        first.recordRun(report("v2"));
        first.recordReview(1, true, "Reviewer A", "checked evidence");

        RunHistoryStore reopened = new RunHistoryStore(dir.toString());
        assertEquals(1, reopened.getRuns().size());
        assertEquals(7, reopened.getRuns().get(0).casesTested);
        assertEquals("Reviewer A", reopened.getReviews().get(0).reviewer);
    }

    @Test
    void lastComparableMatchesProviderModelAndPrompt(@TempDir Path dir) {
        RunHistoryStore store = new RunHistoryStore(dir.toString());
        store.recordRun(report("v1"));
        store.recordRun(report("v2"));
        assertEquals(2, store.lastComparable("groq", "openai/gpt-oss-20b", "v2").runNumber);
        assertEquals(1, store.lastComparable("groq", "openai/gpt-oss-20b", "v1").runNumber);
        assertNull(store.lastComparable("gemini", "x", "v2"));
    }
}
