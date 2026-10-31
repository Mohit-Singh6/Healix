import "dotenv/config";
import { Worker, Job } from "bullmq";
import { redisConnection } from "../lib/redis";
import { INCIDENT_TRIAGE_QUEUE, AlertJobData } from "../lib/queue";
import { deduplicateErrorLog, DeduplicationResult } from "../lib/deduplicate-logs";
import { prisma } from "../lib/prisma";
import http from "node:http";

import { triageGraph } from "../agent/graph";

console.log("Initializing Incident Triage Worker...");

// Minimal HTTP server for Koyeb health checks
const PORT = process.env.PORT || 8080;
const server = http.createServer((req, res) => {
  if (req.url === "/health" || req.url === "/") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "healthy", queue: "incident-triage-queue" }));
  } else {
    res.writeHead(404);
    res.end();
  }
});

server.listen(PORT, () => {
  console.log(`Worker health check running on port ${PORT}`);
});

export const triageWorker = new Worker<AlertJobData, DeduplicationResult>(
  INCIDENT_TRIAGE_QUEUE,
  async (job: Job<AlertJobData>) => {
    console.log(`\n[Job ${job.id}] Processing incoming alert for project: ${job.data.projectId}`);
    console.log(`[Job ${job.id}] Service: ${job.data.serviceName} | Message: ${job.data.message}`);

    const result = await deduplicateErrorLog({
      projectId: job.data.projectId,
      serviceName: job.data.serviceName,
      message: job.data.message,
      stackTrace: job.data.stackTrace,
      statusCode: job.data.statusCode,
      endpoint: job.data.endpoint,
    });

    if (result.isNewIncident) {
      console.log(`[Job ${job.id}] Novel failure detected! Created Incident: ${result.incidentId}`);

      // 1. Link the threadId in Prisma so the UI and approval routes know the checkpoint thread
      await prisma.incident.update({
        where: { id: result.incidentId },
        data: {
          threadId: result.incidentId,
          status: "INVESTIGATING",
        },
      });

      console.log(`[Job ${job.id}] Invoking LangGraph Triage Pipeline for thread: ${result.incidentId}...`);

      try {
        // 2. Invoke the compiled LangGraph with initial state (arg 1) and config (arg 2)
        const agentState = await triageGraph.invoke(
          {
            incidentId: result.incidentId,
            serviceName: job.data.serviceName,
            errorMessage: job.data.message,
            stackTrace: job.data.stackTrace,
            correlatedLogs: [],
            candidateCommits: [],
            hypothesis: "",
            proposedAction: "MANUAL_INTERVENTION",
            humanApprovalStatus: "PENDING",
          },
          {
            configurable: {
              thread_id: result.incidentId,
            },
          }
        );

        console.log(`[Job ${job.id}] LangGraph execution reached gate or completion.`);
        console.log(`[Job ${job.id}] Current Action Proposed: ${agentState.proposedAction}`);
        console.log(`[Job ${job.id}] Approval Status: ${agentState.humanApprovalStatus}`);
      } catch (graphErr) {
        console.error(`[Job ${job.id}] LangGraph execution failed:`, graphErr);
        throw graphErr;
      }
    }
    else {
      console.log(`[Job ${job.id}] Semantically clustered into active Incident: ${result.incidentId}`);
    }

    return result;
  },
  {
    connection: redisConnection,
    // Process up to 5 logs concurrently per worker node
    concurrency: 5,
  }
);

// 2. Lifecycle & Monitoring Event Handlers
triageWorker.on("completed", (job: Job, result: DeduplicationResult) => {
  console.log(`[Job ${job.id}] Completed. (Log ID: ${result.errorLogId})`);
});

triageWorker.on("failed", (job: Job | undefined, err: Error) => {
  console.error(`[Job ${job?.id}] Failed with error:`, err.message);
});

triageWorker.on("error", (err: Error) => {
  console.error("Critical worker connection error:", err);
});

// Graceful Shutdown Handlers (Drain running jobs cleanly on SIGINT / SIGTERM)
async function shutdown(signal: string) {
  console.log(`\nReceived ${signal}. Shutting down worker gracefully...`);
  try {
    server.close();
    await triageWorker.close();
    await redisConnection.quit();
    await prisma.$disconnect();
    console.log("Worker and connections closed cleanly.");
    process.exit(0);
  } catch (error) {
    console.error("Error during graceful shutdown:", error);
    process.exit(1);
  }
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));