package com.vera.model;

/**
 * The structured output we require from the claims recommendation agent
 * for every case. This is what gets checked by both dimensions.
 */
public class AgentResponse {
    public double recommendedAmount;
    public String rationale;
    public boolean conflictDetected;

    public AgentResponse() {
    }
}
