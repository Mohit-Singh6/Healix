import type { IncidentAgentState, IncidentAgentUpdate } from "../state";
import type { HumanDecisionPayload } from "../state";
import { interrupt } from "@langchain/langgraph";
import { prisma } from "../../lib/prisma";

export async function humanApprovalGate(
  state: IncidentAgentState
): Promise<IncidentAgentUpdate> {
  console.log(`[Node D: HumanApprovalGate] Evaluating action: ${state.proposedAction}`);

  // Only pause for actions requiring automated mutations (Revert PR / Config Patch)
  const requiresApproval =
    state.proposedAction === "APPLY_CONFIG_PATCH" ||
    state.proposedAction === "REVERT_PR";

  if (!requiresApproval) {
    console.log(`[Node D] Action ${state.proposedAction} does not require remediation approval.`);
    return {
      humanApprovalStatus: "REJECTED", // Prevents Node E from triggering automated actions
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
      status: "PENDING_APPROVAL",
      rootCause: state.hypothesis,
    },
  });

  // 2. Trigger LangGraph Interrupt (DO NOT wrap in a generic try/catch)
  // Typing the generic ensures 'decision' matches HumanDecisionPayload on resume
  const decision = interrupt({
    reviewInstructions: "Review the proposed action and approve or reject remediation.",
    contentToReview: {
      proposedAction: state.proposedAction,
      actionPayload: state.actionPayload,
      hypothesis: state.hypothesis,
    },
  });

  console.log(`[Node D] Resumed from interrupt with decision:`, decision);

  // 3. Update Incident record once resumed
  await prisma.incident.update({
    where: { id: state.incidentId },
    data: {
      status: decision.status === "APPROVED" ? "MITIGATING" : "DISMISSED",
    },
  });

  return {
    humanApprovalStatus: decision.status,
    humanDecision: decision,
  };
}