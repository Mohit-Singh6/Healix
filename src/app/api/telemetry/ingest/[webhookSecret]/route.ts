import { NextRequest } from "next/server";
import { alertCorsHeaders, handleAlertIngestion } from "@/src/lib/alert-ingestion";

type RouteContext = {
  params: Promise<{ webhookSecret: string }>;
};

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: alertCorsHeaders });
}

export async function POST(request: NextRequest, context: RouteContext) {
  const { webhookSecret } = await context.params;
  return handleAlertIngestion(request, webhookSecret);
}
