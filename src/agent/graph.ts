import { StateGraph, START, END } from "@langchain/langgraph";
import { IncidentState } from "./state";
import { getCheckpointer } from "./checkpointer";
import { correlateLogsNode } from "./nodes/correlateLogs";
import { inspectCodebaseNode } from "./nodes/inspectCodebase";
import { diagnoseRootCauseNode } from "./nodes/diagnoseRootCause";
import { humanApprovalGate } from "./nodes/humanApprovalGate";
import { executeRemediationNode } from "./nodes/executeRemediation";

// Build the state machine
const workflow = new StateGraph(IncidentState)
  .addNode("correlate_logs", correlateLogsNode)
  .addNode("inspect_codebase", inspectCodebaseNode)
  .addNode("diagnose_root_cause", diagnoseRootCauseNode)
  .addNode("human_approval_gate", humanApprovalGate)
  .addNode("execute_remediation", executeRemediationNode)

  // Define linear edges: START -> A -> B -> C -> END
  .addEdge(START, "correlate_logs")
  .addEdge("correlate_logs", "inspect_codebase")
  .addEdge("inspect_codebase", "diagnose_root_cause")
  .addEdge("diagnose_root_cause", "human_approval_gate")
  .addConditionalEdges("human_approval_gate", (state) =>
    state.humanApprovalStatus === "APPROVED" ? "execute_remediation" : END
  )
  .addEdge("execute_remediation", END);

// Compile with persistence
export const triageGraph = workflow.compile({
  checkpointer: getCheckpointer(),
});