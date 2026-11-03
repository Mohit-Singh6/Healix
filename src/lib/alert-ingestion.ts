import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import crypto from "node:crypto";
import { prisma } from "@/src/lib/prisma";
import { alertQueue, AlertJobData } from "@/src/lib/queue";

const alertPayloadSchema = z.object({
  serviceName: z.string().min(1, "serviceName is required"),
  message: z.string().min(1, "message is required"),
  stackTrace: z.string().min(1, "stackTrace is required"),
  statusCode: z.number().int().optional().nullable(),
  endpoint: z.string().optional().nullable(),
});

export const alertCorsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With",
};

export async function handleAlertIngestion(req: NextRequest, pathApiKey?: string) {
  try {
    const apiKey = req.headers.get("x-project-key") ?? pathApiKey ?? req.nextUrl.searchParams.get("apiKey");
    if (!apiKey) {
      return NextResponse.json(
        { error: "Unauthorized: Missing x-project-key header" },
        { status: 401, headers: alertCorsHeaders },
      );
    }

    const project = await prisma.project.findUnique({
      where: { apiKey },
      select: { id: true },
    });
    if (!project) {
      return NextResponse.json(
        { error: "Unauthorized: Invalid project API key" },
        { status: 401, headers: alertCorsHeaders },
      );
    }

    const parseResult = alertPayloadSchema.safeParse(await req.json());
    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: "Unprocessable Entity",
          details: z.flattenError(parseResult.error).fieldErrors,
        },
        { status: 422, headers: alertCorsHeaders },
      );
    }

    const validData = parseResult.data;
    const timeBucket = Math.floor(Date.now() / 5000);
    const dedupeString = `${project.id}:${validData.serviceName}:${validData.message}:${timeBucket}`;
    const jobId = crypto.createHash("sha256").update(dedupeString).digest("hex");
    const jobData: AlertJobData = {
      projectId: project.id,
      projectName: validData.serviceName,
      message: validData.message,
      stackTrace: validData.stackTrace,
      statusCode: validData.statusCode ?? null,
      endpoint: validData.endpoint ?? null,
      timestamp: new Date().toISOString(),
    };

    await alertQueue.add("triage-alert", jobData, { jobId });
    console.log(`Alert job queued with ID: ${jobId} for project ${project.id}`);
    return NextResponse.json({ queued: true, jobId }, { status: 202, headers: alertCorsHeaders });
  } catch (error) {
    console.error("Alert webhook ingestion error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500, headers: alertCorsHeaders },
    );
  }
}
