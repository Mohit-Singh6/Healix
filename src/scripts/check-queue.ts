import "dotenv/config";
import { alertQueue } from "../lib/queue";

async function checkQueue() {
  const counts = await alertQueue.getJobCounts(
    "waiting",
    "active",
    "completed",
    "failed",
    "delayed"
  );
  console.log("Current BullMQ Job Counts in Redis:", counts);
}

checkQueue()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });