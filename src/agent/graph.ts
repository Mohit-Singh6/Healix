import { StateGraph, START, END } from "@langchain/langgraph";
import { IncidentState } from "./state";
import { getCheckpointer } from "./checkpointer";
import { correlateLogsNode } from "./nodes/correlateLogs";
import { inspectCodebaseNode } from "./nodes/inspectCodebase";
import { diagnoseRootCauseNode } from "./nodes/diagnoseRootCause";

// Build the state machine
const workflow = new StateGraph(IncidentState)
  .addNode("correlate_logs", correlateLogsNode)
  .addNode("inspect_codebase", inspectCodebaseNode)
  .addNode("diagnose_root_cause", diagnoseRootCauseNode)

  // Define linear edges: START -> A -> B -> C -> END
  .addEdge(START, "correlate_logs")
  .addEdge("correlate_logs", "inspect_codebase")
  .addEdge("inspect_codebase", "diagnose_root_cause")
  .addEdge("diagnose_root_cause", END);

// Compile with persistence
export const triageGraph = workflow.compile({
  checkpointer: getCheckpointer(),
});