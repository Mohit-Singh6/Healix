import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import crypto from "node:crypto";
import { prisma } from "@/src/lib/prisma";
import { alertQueue, AlertJobData } from "@/src/lib/queue";

// Strict validation for incoming alert payloads
const alertPayloadSchema = z.object({
  serviceName: z.string().min(1, "serviceName is required"),
  message: z.string().min(1, "message is required"),
  stackTrace: z.string().min(1, "stackTrace is required"),
  statusCode: z.number().int().optional().nullable(),
  endpoint: z.string().optional().nullable(),
});

export async function POST(req: NextRequest) {
  try {
    // 1. Auth Check: Verify x-project-key matches a registered Project
    const apiKey = req.headers.get("x-project-key");
    if (!apiKey) {
      return NextResponse.json(
        { error: "Unauthorized: Missing x-project-key header" },
        { status: 401 }
      );
    }

    const project = await prisma.project.findUnique({
      where: { apiKey },
      select: { id: true },
    });

    if (!project) {
      return NextResponse.json(
        { error: "Unauthorized: Invalid project API key" },
        { status: 401 }
      );
    }

    // 2. Schema Validation
    const rawBody = await req.json();
    const parseResult = alertPayloadSchema.safeParse(rawBody);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: "Unprocessable Entity",
          details: z.flattenError(parseResult.error).fieldErrors,
        },
        { status: 422 }
      );
    }

    const validData = parseResult.data;

    // 3. Deterministic Job ID (5-second deduplication bucket)
    // Floor current timestamp to 5-second intervals (5000 ms)
    const timeBucket = Math.floor(Date.now() / 5000);
    const dedupeString = `${project.id}:${validData.serviceName}:${validData.message}:${timeBucket}`;
    const jobId = crypto.createHash("sha256").update(dedupeString).digest("hex");

    // 4. Construct typed job payload
    const jobData: AlertJobData = {
      projectId: project.id,
      serviceName: validData.serviceName,
      message: validData.message,
      stackTrace: validData.stackTrace,
      statusCode: validData.statusCode ?? null,
      endpoint: validData.endpoint ?? null,
      timestamp: new Date().toISOString(),
    };

    // 5. Instant Offload to BullMQ Queue
    // If a job with this exact jobId already exists in the queue, BullMQ ignores duplicate adds
    await alertQueue.add("triage-alert", jobData, {
      jobId,
    });

    console.log(`Alert job queued with ID: ${jobId} for project ${project.id}`);

    // 6. Fast response (HTTP 202 Accepted)
    return NextResponse.json(
      {
        queued: true,
        jobId,
      },
      { status: 202 }
    );
  } catch (error) {
    console.error("Alert webhook ingestion error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}