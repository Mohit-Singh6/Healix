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
    serviceName: "payment-gateway",
    message: "Stripe connection timeout during checkout",
    stackTrace: "TimeoutError: Request to api.stripe.com timed out after 5000ms\n at StripeClient.request (/node_modules/stripe/lib/client.js:120:11)",
    statusCode: 504,
    endpoint: "/api/checkout/pay",
  };

  // 2. Fire 5 rapid requests in parallel to test deduplication and non-blocking 202 responses
  console.log("Firing 5 concurrent alert payloads to POST /api/webhooks/alerts...");

  const requests = Array.from({ length: 5 }).map(async (_, idx) => {
    const res = await fetch("http://localhost:3000/api/webhooks/alerts", {
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