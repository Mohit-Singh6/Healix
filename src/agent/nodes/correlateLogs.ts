import { prisma } from "../../lib/prisma";
import type { IncidentAgentState, IncidentAgentUpdate } from "../state";

export async function correlateLogsNode(
  state: IncidentAgentState
): Promise<IncidentAgentUpdate> {
  console.log(`[Node A: CorrelateLogs] Fetching logs for incident: ${state.incidentId}`);

  const incident = await prisma.incident.findUnique({
    where: { id: state.incidentId },
    select: { createdAt: true, projectId: true },
  });

  if (!incident) {
    console.warn(`[Node A] Incident ${state.incidentId} not found in database.`);
    return { correlatedLogs: [] };
  }

  const windowMinutes = 10;
  const startTime = new Date(incident.createdAt.getTime() - windowMinutes * 60 * 1000);
  const endTime = new Date(incident.createdAt.getTime() + windowMinutes * 60 * 1000);

  // Fetch adjacent logs from the same service within the 20-minute window
  const logs = await prisma.errorLog.findMany({
    where: {
      projectId: incident.projectId,
      serviceName: state.serviceName,
      createdAt: {
        gte: startTime,
        lte: endTime,
      },
    },
    select: {
      createdAt: true,
      statusCode: true,
      endpoint: true,
      message: true,
    },
    orderBy: { createdAt: "asc" },
    take: 50,
  });

  const formattedLogs = logs.map(
    (log) =>
      `[${log.createdAt.toISOString()}] [HTTP ${log.statusCode || "N/A"}] ${log.endpoint || "N/A"}: ${log.message}`
  );

  console.log(`[Node A: CorrelateLogs] Found ${formattedLogs.length} correlated log lines.`);
  return { correlatedLogs: formattedLogs };
}