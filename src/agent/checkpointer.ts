import { PostgresSaver } from "@langchain/langgraph-checkpoint-postgres";

let checkpointerInstance: PostgresSaver | null = null;

/**
 * Returns a singleton PostgresSaver instance configured for Neon PostgreSQL.
 *
 * Uses the native node-postgres connection pool internally to store graph checkpoints,
 * writes, and execution metadata.
 */
export function getCheckpointer(): PostgresSaver {
  if (checkpointerInstance) {
    return checkpointerInstance;
  }

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not defined in environment variables.");
  }

  // Neon PostgreSQL requires SSL connections
  const normalizedConnString = connectionString.includes("sslmode=")
    ? connectionString
    : `${connectionString}${connectionString.includes("?") ? "&" : "?"}sslmode=require`;

  checkpointerInstance = PostgresSaver.fromConnString(normalizedConnString);
  return checkpointerInstance;
}