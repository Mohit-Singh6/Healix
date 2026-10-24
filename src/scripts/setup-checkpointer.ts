import "dotenv/config";
import { getCheckpointer } from "../agent/checkpointer";

async function runCheckpointerSetup() {
  console.log("Connecting to Neon PostgreSQL to initialize LangGraph checkpointer schema...");
  const checkpointer = getCheckpointer();

  try {
    // Creates the required checkpoint tables in Neon if they do not exist
    await checkpointer.setup();
    console.log("LangGraph checkpoint tables verified and initialized successfully in Neon.");
  } catch (error) {
    console.error("Failed to execute checkpointer.setup():", error);
    process.exit(1);
  } finally {
    // Closes the underlying pg pool so the script exits cleanly
    await checkpointer.end();
  }
}

runCheckpointerSetup();