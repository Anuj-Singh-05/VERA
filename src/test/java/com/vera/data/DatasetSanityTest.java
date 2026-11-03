package com.vera.data;

import com.vera.agent.MockAgentLogic;
import com.vera.model.ClaimCase;
import com.vera.model.ClaimDocument;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class DatasetSanityTest {

    private final List<ClaimCase> cases = loadCases();

    private static List<ClaimCase> loadCases() {
        try {
            return new DatasetLoader().loadDataset();
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    @Test
    void hasFiveBatchesWithTheExpectedCaseCounts() {
        assertEquals(36, cases.size());
        for (int batch = 1; batch <= 4; batch++) {
            final int b = batch;
            assertEquals(8, cases.stream().filter(c -> c.batch == b).count());
        }
        assertEquals(4, cases.stream().filter(c -> c.batch == 5).count());
    }

    /** Batch 5 probes the edge of the 12% rule: two cases just under it, two just over. */
    @Test
    void boundaryCasesSitJustEitherSideOfTheThreshold() {
        int under = 0, over = 0;
        for (ClaimCase c : cases) {
            if (c.batch != 5) continue;
            double min = c.documents.stream().mapToDouble(d -> d.statedAmount).min().orElse(0);
            double max = c.documents.stream().mapToDouble(d -> d.statedAmount).max().orElse(0);
            double spread = (max - min) / min;
            assertTrue(spread >= 0.09 && spread <= 0.14, c.id + " spread " + spread + " should be within 9-14%");
            if (spread > MockAgentLogic.CONFLICT_SPREAD) over++; else under++;
        }
        assertEquals(2, under);
        assertEquals(2, over);
    }

    @Test
    void everyCaseHasAtLeastTwoDocumentsAndAPositiveLimit() {
        for (ClaimCase c : cases) {
            assertTrue(c.documents.size() >= 2, c.id + " needs 2+ documents");
            assertTrue(c.policyCoverageLimit > 0, c.id + " needs a positive limit");
        }
    }

    @Test
    void conflictLabelsMatchTheSpreadRule() {
        for (ClaimCase c : cases) {
            assertEquals(c.hasConflict, MockAgentLogic.documentsConflict(c),
                    c.id + " ground-truth label disagrees with the " + MockAgentLogic.CONFLICT_SPREAD + " spread rule");
        }
    }

    /** An injected figure must be unsupported by the documents yet within the limit,
     *  so that only the injection check (not the coverage check) can catch it. */
    @Test
    void injectionCasesAreWellFormed() {
        long injectionCases = 0;
        for (ClaimCase c : cases) {
            if (c.injectedAmount == null) continue;
            injectionCases++;
            double max = c.documents.stream().mapToDouble(d -> d.statedAmount).max().orElse(0);
            assertTrue(c.injectedAmount > max, c.id + " injected amount must exceed every document");
            assertTrue(c.injectedAmount <= c.policyCoverageLimit, c.id + " injected amount must be within the limit");
            boolean hasNote = false;
            for (ClaimDocument d : c.documents) {
                if (d.note != null && !d.note.isBlank()) hasNote = true;
            }
            assertTrue(hasNote, c.id + " must carry the injected instruction in a document note");
        }
        assertEquals(4, injectionCases);
        assertEquals(4, cases.stream().filter(c -> c.piiValues != null && !c.piiValues.isEmpty()).count());
    }
}
