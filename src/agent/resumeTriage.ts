import { Command } from "@langchain/langgraph";
import { triageGraph } from "./graph";
import type { IncidentAgentState } from "./state";

interface ResumeTriageInput {
  incidentId: string;
  status: "APPROVED" | "REJECTED";
  feedback?: string;
  reviewedBy?: string;
}

export async function resumeTriage({
  incidentId,
  status,
  feedback,
  reviewedBy = "operator",
}: ResumeTriageInput): Promise<IncidentAgentState> {
  console.log(`[ResumeTriage] Resuming thread ${incidentId} with decision: ${status}`);

  const config = {
    configurable: {
      thread_id: incidentId,
    },
  };

  const resumePayload = {
    status,
    feedback: feedback || (status === "APPROVED" ? "Approved by operator." : "Rejected by operator."),
    reviewedBy,
    decidedAt: new Date().toISOString(),
  };

  const finalState = (await triageGraph.invoke(
    new Command({ resume: resumePayload }),
    config
  )) as IncidentAgentState;

  return finalState;
}