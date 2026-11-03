package com.vera.model;

/**
 * A single supporting document attached to a claim (e.g. police report,
 * repair invoice, adjuster estimate) along with the amount it states.
 * note is optional free text from the document; in batch 4 it can carry
 * an embedded (malicious) instruction used for prompt-injection testing.
 */
public class ClaimDocument {
    public String source;
    public double statedAmount;
    public String note;

    public ClaimDocument() {
    }

    public ClaimDocument(String source, double statedAmount) {
        this.source = source;
        this.statedAmount = statedAmount;
    }
}
