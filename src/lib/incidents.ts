import type { IncidentSeverity, Prisma } from "@prisma/client";
import type { DashboardIncident, IncidentData, ProposedIncidentAction } from "@/src/components/incidents/incident-data";
import { formatDateTimeIST } from "@/src/lib/date-time";
import { prisma } from "@/src/lib/prisma";

type JsonRecord = Record<string, unknown>;

function isRecord(value: Prisma.JsonValue | null): value is Prisma.JsonObject {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function getString(record: JsonRecord, key: string): string | null {
  const value = record[key];
  return typeof value === "string" && value.length > 0 ? value : null;
}

function severityLabel(severity: IncidentSeverity): IncidentData["severity"] {
  switch (severity) {
    case "SEV1":
      return "CRITICAL";
    case "SEV2":
      return "HIGH";
    case "SEV3":
      return "MEDIUM";
  }
}

function displayIncidentId(id: string): string {
  return `INC-${id.slice(-6).toUpperCase()}`;
}

function proposedActionFrom(value: string | null): ProposedIncidentAction | null {
  switch (value) {
    case "REVERT_PR":
    case "BUGFIX_PR":
    case "APPLY_CONFIG_PATCH":
    case "MANUAL_INTERVENTION":
    case "NO_ACTION":
      return value;
    default:
      return null;
  }
}

function targetFromStackTrace(stackTrace: string): string | null {
  const match = stackTrace.match(/at\s+([^\s(]+)\s+\(([^():]+):\d+:\d+\)/);
  if (!match) return null;

  const file = match[2].replace(/\\/g, "/");
  return `${file}:${match[1]}`;
}

function getDiff(actionPayload: JsonRecord): { removed: string[]; added: string[] } {
  const replacements = actionPayload.replacements;
  if (Array.isArray(replacements)) {
    const validReplacements = replacements.filter(
      (item): item is { searchBlock: string; replaceBlock: string } =>
        typeof item === "object" &&
        item !== null &&
        "searchBlock" in item &&
        "replaceBlock" in item &&
        typeof item.searchBlock === "string" &&
        typeof item.replaceBlock === "string",
    );
    if (validReplacements.length > 0) {
      return {
        removed: validReplacements.map((item) => item.searchBlock),
        added: validReplacements.map((item) => item.replaceBlock),
      };
    }
  }

  const patchedFileContent = getString(actionPayload, "patchedFileContent");
  if (patchedFileContent) {
    return { removed: [], added: patchedFileContent.split("\n").slice(0, 120) };
  }

  return { removed: [], added: [] };
}

function incidentActionPayload(value: Prisma.JsonValue | null): JsonRecord {
  return isRecord(value) ? value : {};
}

function actionSummary(
  action: string | null,
  payload: JsonRecord,
): string | null {
  switch (action) {
    case "REVERT_PR":
      return `Revert commit ${getString(payload, "targetCommitSha") ?? "identified by triage"}`;
    case "BUGFIX_PR":
      return `Create a fix pull request for ${getString(payload, "targetFilePath") ?? "the affected source file"}`;
    case "APPLY_CONFIG_PATCH":
      return `Apply runtime configuration ${getString(payload, "configKey") ?? "patch"}`;
    case "MANUAL_INTERVENTION":
      return "Manual intervention recommended";
    case "NO_ACTION":
      if (getString(payload, "noFixExplanation")) {
        return `No action required: ${getString(payload, "noFixExplanation")}`;
      }
      return `No automated remediation recommended${
        getString(payload, "noFixReason") ? ` (${getString(payload, "noFixReason")})` : ""
      }`;
    default:
      return null;
  }
}

export async function listUserIncidents(userId: string): Promise<DashboardIncident[]> {
  const records = await prisma.incident.findMany({
    where: { project: { is: { userId } } },
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      title: true,
      errorMessage: true,
      stackTrace: true,
      severity: true,
      status: true,
      proposedAction: true,
      humanApprovalStatus: true,
      reviewedBy: true,
      actionPayload: true,
      createdAt: true,
      _count: { select: { logs: true } },
      project: { select: { name: true } },
      logs: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { message: true },
      },
    },
  });

  return records.map((incident) => {
    const payload = incidentActionPayload(incident.actionPayload);
    const stackTrace = incident.stackTrace ?? "";
    const proposedAction = proposedActionFrom(incident.proposedAction);

    return {
      id: incident.id,
      displayId: displayIncidentId(incident.id),
      severity: severityLabel(incident.severity),
      signature: incident.errorMessage || incident.logs[0]?.message || incident.title,
      project: incident.project.name,
      volume: incident._count.logs,
      createdAt: incident.createdAt.toISOString(),
      status: incident.status,
      proposedAction,
      humanApprovalStatus: incident.humanApprovalStatus,
      reviewedBy: incident.reviewedBy,
      target: getString(payload, "targetFilePath") ?? targetFromStackTrace(stackTrace),
    };
  });
}

export async function getUserIncident(userId: string, incidentId: string): Promise<IncidentData | null> {
  const incident = await prisma.incident.findFirst({
    where: { id: incidentId, project: { is: { userId } } },
    select: {
      id: true,
      title: true,
      serviceName: true,
      errorMessage: true,
      severity: true,
      status: true,
      rootCause: true,
      proposedAction: true,
      actionPayload: true,
      targetCommitSha: true,
      humanApprovalStatus: true,
      operatorFeedback: true,
      reviewedBy: true,
      decidedAt: true,
      remediationPrUrl: true,
      createdAt: true,
      updatedAt: true,
      project: { select: { name: true } },
      postMortem: {
        select: {
          title: true,
          fullMarkdown: true,
        },
      },
      logs: {
        orderBy: { createdAt: "desc" },
        take: 50,
        select: {
          createdAt: true,
          statusCode: true,
          message: true,
          stackTrace: true,
        },
      },
    },
  });

  if (!incident) return null;

  const payload = incidentActionPayload(incident.actionPayload);
  const stackTrace = incident.logs.find((log) => log.stackTrace)?.stackTrace ?? "";
  const proposedAction = proposedActionFrom(incident.proposedAction);
  const logs = incident.logs
    .slice()
    .reverse()
    .map((log) => {
      const level = log.statusCode && log.statusCode >= 500
        ? "ERROR"
        : log.statusCode && log.statusCode >= 400
          ? "WARN"
          : "INFO";
      const status = log.statusCode ? ` HTTP ${log.statusCode}` : "";
      return `${formatDateTimeIST(log.createdAt)} ${level}${status} ${log.message}`;
    });

  const commitHash = incident.targetCommitSha ?? getString(payload, "targetCommitSha");
  const targetFile = getString(payload, "targetFilePath") ?? targetFromStackTrace(stackTrace)?.split(":")[0] ?? null;

  return {
    id: incident.id,
    displayId: displayIncidentId(incident.id),
    title: incident.title.replace(`[${incident.project.name}] `, ""),
    project: incident.project.name,
    severity: severityLabel(incident.severity),
    timestamp: incident.createdAt.toISOString(),
    updatedAt: incident.updatedAt.toISOString(),
    hypothesis: incident.rootCause ?? "Triage is still investigating this incident.",
    confidence: null,
    suspectCommit: {
      hash: commitHash,
      author: getString(payload, "suspectCommitAuthor"),
      time: getString(payload, "suspectCommitDate"),
      file: targetFile,
      functionName: null,
      message: getString(payload, "suspectCommitMessage"),
    },
    diff: getDiff(payload),
    logs,
    rawTrace: stackTrace || "No stack trace was provided with the incident.",
    status: incident.status,
    proposedAction,
    humanApprovalStatus: incident.humanApprovalStatus,
    operatorFeedback: incident.operatorFeedback,
    reviewedBy: incident.reviewedBy,
    decidedAt: incident.decidedAt?.toISOString() ?? null,
    remediationPrUrl: incident.remediationPrUrl,
    actionSummary: actionSummary(incident.proposedAction, payload),
    postMortemMarkdown: incident.postMortem?.fullMarkdown ?? null,
  };
}
