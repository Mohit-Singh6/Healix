import { HumanDecisionPayloadSchema } from "../state";
import type { IncidentAgentState, IncidentAgentUpdate } from "../state";
import { interrupt } from "@langchain/langgraph";
import { prisma } from "../../lib/prisma";

export async function humanApprovalGate(
  state: IncidentAgentState
): Promise<IncidentAgentUpdate> {
  console.log(`[Node D: HumanApprovalGate] Evaluating action: ${state.proposedAction}`);

  // Only pause for actions requiring automated mutations (Revert PR / Config Patch)
  const requiresApproval =
    state.proposedAction === "APPLY_CONFIG_PATCH" ||
    state.proposedAction === "BUGFIX_PR" ||
    state.proposedAction === "REVERT_PR";
  const suspectCommit = state.candidateCommits.find(
    (commit) => commit.sha === state.actionPayload.targetCommitSha,
  );
  const actionPayload = suspectCommit
    ? {
        ...state.actionPayload,
        ...(suspectCommit.author ? { suspectCommitAuthor: suspectCommit.author } : {}),
        ...(suspectCommit.message ? { suspectCommitMessage: suspectCommit.message } : {}),
        ...(suspectCommit.date ? { suspectCommitDate: suspectCommit.date } : {}),
      }
    : state.actionPayload;

  if (!requiresApproval) {
    console.log(`[Node D] Action ${state.proposedAction} does not require remediation approval.`);
    await prisma.incident.update({
      where: { id: state.incidentId },
      data: {
        severity: state.incidentSeverity,
        rootCause: state.hypothesis,
        proposedAction: state.proposedAction,
        actionPayload,
        targetCommitSha: actionPayload.targetCommitSha ?? null,
      },
    });

    return {
      humanApprovalStatus: "REJECTED",
      actionPayload,
      humanDecision: {
        status: "REJECTED",
        feedback: `Action ${state.proposedAction} requires manual handling or no action.`,
        reviewedBy: "system",
        decidedAt: new Date().toISOString(),
      },
    };
  }

  // 1. Sync state with your main Neon Incident record so the dashboard sees it
  await prisma.incident.update({
    where: { id: state.incidentId },
    data: {
      severity: state.incidentSeverity,
      status: "PENDING_APPROVAL",
      rootCause: state.hypothesis,
      actionPayload,
      proposedAction: state.proposedAction,
      targetCommitSha: actionPayload.targetCommitSha ?? null,
      humanApprovalStatus: "PENDING",
    },
  });

  // 2. Trigger LangGraph Interrupt (DO NOT wrap in a generic try/catch)
  // Typing the generic ensures 'decision' matches HumanDecisionPayload on resume
  const rawDecision: unknown = interrupt({
    reviewInstructions: "Review the proposed action and approve or reject remediation.",
    contentToReview: {
      severity: state.incidentSeverity,
      proposedAction: state.proposedAction,
      actionPayload,
      hypothesis: state.hypothesis,
    },
  });
  const decision = HumanDecisionPayloadSchema.parse(rawDecision);

  console.log(`[Node D] Resumed from interrupt with decision:`, decision);

  // 3. Update Incident record once resumed
  await prisma.incident.update({
    where: { id: state.incidentId },
    data: {
      status: decision.status === "APPROVED" ? "MITIGATING" : "DISMISSED",
      humanApprovalStatus: decision.status,
      operatorFeedback: decision.feedback,
      reviewedBy: decision.reviewedBy,
      decidedAt: new Date(),
    },
  });

  return {
    humanApprovalStatus: decision.status,
    humanDecision: decision,
    actionPayload,
  };
}