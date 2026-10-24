// src/scripts/test-webhook-burst.ts
import "dotenv/config";
import { prisma } from "../lib/prisma";

async function runBurstTest() {
  // 1. Fetch your test project's apiKey
  const project = await prisma.project.findFirst({
    select: { apiKey: true, id: true, name: true },
  });

  if (!project) {
    console.error("No project found. Run test-dedup.ts first to create one.");
    process.exit(1);
  }

  console.log(`Testing against project "${project.name}" (Key: ${project.apiKey})`);

  const payload = {
    serviceName: "auth-service",
    message: `JsonWebTokenError: invalid signature on token verification - test #${Date.now()}`,
    stackTrace: `JsonWebTokenError: invalid signature
    at Object.module.exports [as verify] (/app/node_modules/jsonwebtoken/verify.js:133:19)
    at verifyAuthToken (/app/src/middlewares/auth.ts:42:21)
    at Layer.handle [as handle_request] (/app/node_modules/express/lib/router/layer.js:95:5)
    at next (/app/node_modules/express/lib/router/route.js:144:13)`,
    statusCode: 401,
    endpoint: "/api/v1/auth/session",
  };

  // 2. Fire 5 rapid requests in parallel to test deduplication and non-blocking 202 responses
  console.log("Firing 5 concurrent alert payloads to POST /api/webhooks/alerts...");

  const requests = Array.from({ length: 5 }).map(async (_, idx) => {
    const res = await fetch("https://healix.mohits.site/api/webhooks/alerts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-project-key": project.apiKey,
      },
      body: JSON.stringify(payload),
    });

    const body = await res.json();
    return { status: res.status, body, reqNumber: idx + 1 };
  });

  const results = await Promise.all(requests);
  console.log("\nResults from Ingestion Route:");
  results.forEach((r) => {
    console.log(`Request #${r.reqNumber}: HTTP ${r.status}`, r.body);
  });
}

runBurstTest()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Test error:", err);
    process.exit(1);
  });