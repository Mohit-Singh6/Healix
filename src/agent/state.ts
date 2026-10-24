import { StateSchema, ReducedValue } from "@langchain/langgraph";
import { z } from "zod";

// 1. Zod Domain Schemas & Inferred Types

export const CandidateCommitSchema = z.object({
  sha: z.string(),
  diff: z.string(),
  message: z.string(),
  author: z.string().optional(),
  date: z.string().optional(),
  filesChanged: z.array(z.string()),
});
export type CandidateCommit = z.infer<typeof CandidateCommitSchema>;

export const ProposedActionSchema = z.enum([
  "REVERT_PR",
  "APPLY_CONFIG_PATCH",
  "NO_ACTION",
]);
export type ProposedAction = z.infer<typeof ProposedActionSchema>;

export const HumanApprovalStatusSchema = z.enum([
  "PENDING",
  "APPROVED",
  "REJECTED",
]);
export type HumanApprovalStatus = z.infer<typeof HumanApprovalStatusSchema>;

export const HumanDecisionPayloadSchema = z.object({
  status: HumanApprovalStatusSchema,
  feedback: z.string().optional(),
  reviewedBy: z.string().optional(),
  decidedAt: z.string().optional(),
});
export type HumanDecisionPayload = z.infer<typeof HumanDecisionPayloadSchema>;

// 2. LangGraph StateSchema Definition

/**
 * Unified LangGraph StateSchema for Incident Triage.
 *
 * Each property defines a state channel.
 * - Standard Zod types create a "LastValue" channel (the newest node output overwrites the old value).
 * - ReducedValue allows defining defaults and custom reducers (like list aggregation).
 */
export const IncidentState = new StateSchema({
  // --- Immutable Incident Baseline (passed at graph start) ---
  incidentId: z.string(),
  serviceName: z.string(),
  stackTrace: z.string(),
  errorMessage: z.string(),

  // --- Node A: Log Correlator ---
  // ReducedValue with an empty array default so nodes can safely append/read logs.
  correlatedLogs: new ReducedValue(z.array(z.string()).default(() => []), {
    reducer: (_current, update) => update,
  }),

  // --- Node B: Codebase Inspector (GitHub Octokit) ---
  // Commits matching stack frames found in the last 24h.
  candidateCommits: new ReducedValue(
    z.array(CandidateCommitSchema).default(() => []),
    {
      reducer: (_current, update) => update,
    }
  ),

  // --- Node C: Root Cause Diagnostic & Proposed Fix (Gemini) ---
  hypothesis: z.string().default(""),
  proposedAction: ProposedActionSchema.default("NO_ACTION"),
  actionPayload: z.record(z.string(), z.unknown()).default({}),

  // --- Node D: Human-in-the-Loop (HITL) Gate ---
  // Pauses with interrupt(). Populated when operator clicks Approve or Reject.
  humanApprovalStatus: HumanApprovalStatusSchema.default("PENDING"),
  humanDecision: HumanDecisionPayloadSchema.nullable().default(null),

  // --- Node E: Execution Output & Post-Mortem ---
  remediationResult: z.record(z.string(), z.unknown()).nullable().default(null),
  postMortemMarkdown: z.string().default(""),
});

// 3. Extracted Types for Nodes and Graphs

/** The complete state read inside node functions */
export type IncidentAgentState = typeof IncidentState.State;

/** The partial update returned by a node */
export type IncidentAgentUpdate = typeof IncidentState.Update;