// src/scripts/test-node-c.ts
import { inspectCodebaseNode } from "../agent/nodes/inspectCodebase";
import { diagnoseRootCauseNode } from "../agent/nodes/diagnoseRootCause";
import type { IncidentAgentState } from "../agent/state";

async function runTest() {
  console.log("=== Testing Node C Interactive Tool Loop & Diagnosis ===");

  // 1. Setup mock state using an existing project ID from your DB
  // Replace with a valid incidentId or projectId known in your database
  const mockState: Partial<IncidentAgentState> = {
    incidentId: "cmvyzf6m800002khfroxpvmyt",
    projectName: "blood-donation-frontend",
    errorMessage: "TypeError: Cannot read properties of null (reading 'length')",
    endpoint: "/login",
    stackTrace:
      "TypeError: Cannot read properties of null (reading 'length')\n at eo (assets/index-CZN213AP.js:1:123)",
    candidateCommits: [],
    inspectedFiles: [],
  };

  try {
    // 2. Run Node B to get candidate commits & pre-hydrated files
    console.log("\n[1/2] Running Node B to gather codebase context...");
    const nodeBUpdate = (await inspectCodebaseNode(mockState as IncidentAgentState)) as any;

    const populatedState = {
      ...mockState,
      ...nodeBUpdate,
    } as IncidentAgentState;

    console.log(`- Commits found: ${populatedState.candidateCommits?.length ?? 0}`);
    console.log(`- Hydrated files: ${populatedState.inspectedFiles?.map((f) => f.path).join(", ")}`);

    // 3. Run Node C to trigger the Gemini tool-loop
    console.log("\n[2/2] Running Node C (Interactive Diagnosis Loop)...");
    const nodeCResult = (await diagnoseRootCauseNode(populatedState)) as any;

    console.log("\n================ DIAGNOSIS RESULT ================");
    console.log("Incident Severity :", nodeCResult.incidentSeverity);
    console.log("Proposed Action   :", nodeCResult.proposedAction);
    console.log("Hypothesis        :\n", nodeCResult.hypothesis);

    if (nodeCResult.proposedAction === "BUGFIX_PR") {
      console.log("\n--- Target Patch Details ---");
      console.log("Target File :", nodeCResult.actionPayload?.targetFilePath);
      console.log("Patch Mode  :", nodeCResult.actionPayload?.patchMode);
      console.log("Replacements:", JSON.stringify(nodeCResult.actionPayload?.replacements, null, 2));
    } else if (nodeCResult.proposedAction === "REVERT_PR") {
      console.log("\nTarget Commit SHA to Revert:", nodeCResult.actionPayload?.commitSha);
    }

    console.log("\nNode C executed cleanly!");
  } catch (err) {
    console.error("\nNode C diagnosis failed:", err);
  }
}

runTest();