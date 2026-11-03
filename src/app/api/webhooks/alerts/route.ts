import { NextRequest } from "next/server";
import { alertCorsHeaders, handleAlertIngestion } from "@/src/lib/alert-ingestion";

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: alertCorsHeaders });
}

export async function POST(request: NextRequest) {
  return handleAlertIngestion(request);
}
