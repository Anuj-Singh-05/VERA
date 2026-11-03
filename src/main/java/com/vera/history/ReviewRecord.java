package com.vera.history;

/** One human review decision, kept as an audit trail. */
public class ReviewRecord {
    public int runNumber;
    public int batch;
    public boolean approved;
    public String reviewer;
    public String reason;
    public String timestamp;

    public ReviewRecord() {
    }
}
