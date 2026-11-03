import { handleAutoInstrument } from "@/src/lib/auto-instrument";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await params;
  return handleAutoInstrument(projectId);
}
