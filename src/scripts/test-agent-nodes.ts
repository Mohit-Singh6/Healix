// src/scripts/test-agent-nodes.ts
import "dotenv/config";
import { prisma } from "../lib/prisma";
import { triageGraph } from "../agent/graph";

async function testTriageAgent() {
  // 1. Pick the latest novel incident created in your database
  const incident = await prisma.incident.findFirst({
    orderBy: { createdAt: "desc" },
  });

  if (!incident) {
    console.error("No incident found in database. Run test-webhook-burst.ts first.");
    process.exit(1);
  }

  // 2. Fetch the latest associated error log for this incident
  const latestLog = await prisma.errorLog.findFirst({
    where: { incidentId: incident.id },
    orderBy: { createdAt: "desc" },
  });

  const serviceName = latestLog?.serviceName || "unknown-service";

  console.log(`Starting Triage Graph for Incident: ${incident.id}`);
  console.log(`Service: ${serviceName}`);

  const config = {
    configurable: {
      thread_id: incident.id, // Maps 1:1 to Incident ID in Neon checkpoints
    },
  };

  const initialInput = {
    incidentId: incident.id,
    serviceName,
    stackTrace: latestLog?.stackTrace || "Error: Unknown failure",
    errorMessage: incident.title,
  };

  // Execute Graph through Node C
  const finalState = await triageGraph.invoke(initialInput, config);

  console.log("\n================ AGENT TRIAGE RESULTS ================");
  console.log(`Correlated Logs Found: ${finalState.correlatedLogs.length}`);
  console.log(`Candidate Commits Found: ${finalState.candidateCommits.length}`);
  console.log(`\nProposed Action: ${finalState.proposedAction}`);
  console.log(`\nHypothesis:\n${finalState.hypothesis}`);
  console.log(`\nAction Payload:\n`, JSON.stringify(finalState.actionPayload, null, 2));
  console.log("======================================================");
}

testTriageAgent()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Agent execution failed:", err);
    process.exit(1);
  });