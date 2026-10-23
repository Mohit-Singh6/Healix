import "dotenv/config";
import { Worker, Job } from "bullmq";
import { redisConnection } from "../lib/redis";
import { INCIDENT_TRIAGE_QUEUE, AlertJobData } from "../lib/queue";
import { deduplicateErrorLog, DeduplicationResult } from "../lib/deduplicate-logs";
import { prisma } from "../lib/prisma";
import http from "node:http";

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
      
      // In Phase 3: Trigger LangGraph AI triage investigation agent here



    } else {
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