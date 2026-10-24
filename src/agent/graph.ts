import { StateGraph, START, END } from "@langchain/langgraph";
import { IncidentState } from "./state";
import { getCheckpointer } from "./checkpointer";

// Initialize graph using the Zod-backed IncidentState schema
const workflow = new StateGraph(IncidentState)
  // Nodes will be attached here (Part 3)
  // .addNode("correlate_logs", nodeA)
  // ...
  .addEdge(START, END);

// Compile the graph passing the Neon checkpointer
export const triageGraph = workflow.compile({
  checkpointer: getCheckpointer(),
});