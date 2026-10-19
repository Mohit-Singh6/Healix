import { Queue } from "bullmq";
import { redisConnection } from "./redis";

// Name of our triage queue in Redis
export const INCIDENT_TRIAGE_QUEUE = "incident-triage-queue";

// Strongly-typed job payload
export interface AlertJobData {
  projectId: string;
  serviceName: string;
  message: string;
  stackTrace: string;
  statusCode?: number | null;
  endpoint?: string | null;
  timestamp: string;
}

const globalForQueue = globalThis as unknown as {
  alertQueue: Queue<AlertJobData> | undefined;
};

function createAlertQueue(): Queue<AlertJobData> {
  return new Queue<AlertJobData>(INCIDENT_TRIAGE_QUEUE, {
    connection: redisConnection,
    defaultJobOptions: {
      // Retry up to 3 times before failing
      attempts: 3,
      // Exponential backoff: 2s, then 4s, then 8s
      backoff: {
        type: "exponential",
        delay: 2000,
      },
      // Automatically prune completed/failed jobs to keep Redis lean
      removeOnComplete: {
        count: 500, // Keep last 500 completed jobs for audit logs
        age: 60 * 60 * 24, // Or delete jobs older than 24 hours
      },
      removeOnFail: {
        count: 1000, // Retain failed jobs longer for inspection
      },
    },
  });
}

export const alertQueue = globalForQueue.alertQueue ?? createAlertQueue();

if (process.env.NODE_ENV !== "production") {
  globalForQueue.alertQueue = alertQueue;
}