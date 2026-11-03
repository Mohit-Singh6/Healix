import { handleAutoInstrument } from "@/src/lib/auto-instrument";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ serviceId: string }> },
) {
  const { serviceId } = await params;
  return handleAutoInstrument(serviceId);
}
