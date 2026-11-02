import { inspectCodebaseNode } from "@/src/agent/nodes/inspectCodebase";
import type { IncidentAgentState } from "@/src/agent/state";

async function runTest() {
  console.log("Testing Node B Blast-Radius & Groq Filtering...");

  // Mock a sample incident state targeting your project
  const mockState: Partial<IncidentAgentState> = {
    incidentId: "cmvxwrn4n00002llrfdxpbhll", // Grab one from your Neon DB
    errorMessage: "TypeError: Cannot read properties of null (reading 'length')",
    endpoint: "/login",
    stackTrace: "TypeError: Cannot read properties of null (reading 'length')\n at eo (assets/index-CZN213AP.js:1:123)",
    candidateCommits: [],
    inspectedFiles: [],
  };

  try {
    const rawResult = await inspectCodebaseNode(mockState as IncidentAgentState);
    const result = rawResult as any;

    console.log("\n Results:");
    console.log("- Commits found:", result.candidateCommits?.length ?? 0);
    console.log("- Files hydrated:", result.inspectedFiles?.map((f: any) => f.path));

    if (Array.isArray(result.inspectedFiles) && result.inspectedFiles.length > 0) {
      console.log(" First file content preview (first 100 chars):");
      console.log(result.inspectedFiles[0].content.slice(0, 100));
      console.log("\n Part 1 implementation is functional!");
    } else {
      console.warn(" No files hydrated. Check Octokit credentials or filter rules.");
    }
  } catch (err) {
    console.error(" Node B test failed:", err);
  }
}

runTest();