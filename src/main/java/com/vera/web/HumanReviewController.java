package com.vera.web;

import com.vera.history.ReviewRecord;
import com.vera.history.RunHistoryStore;
import com.vera.report.CertificationService;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/review")
@CrossOrigin(origins = "*")
public class HumanReviewController {

    private final CertificationService certificationService;
    private final RunHistoryStore historyStore;

    public HumanReviewController(CertificationService certificationService, RunHistoryStore historyStore) {
        this.certificationService = certificationService;
        this.historyStore = historyStore;
    }

    /**
     * A human reviewer approves or rejects a batch that isn't auto-CERTIFIED.
     * Every decision is written to the persisted review log with who, why and when.
     */
    @PostMapping("/{batch}")
    public ReviewRecord review(@PathVariable int batch,
                               @RequestParam boolean approve,
                               @RequestParam(defaultValue = "anonymous") String reviewer,
                               @RequestParam(defaultValue = "") String reason) {
        certificationService.applyHumanOverride(batch, approve);
        return historyStore.recordReview(batch, approve, reviewer, reason);
    }

    /** Audit trail of every review decision. */
    @GetMapping("/log")
    public List<ReviewRecord> log() {
        return historyStore.getReviews();
    }
}
