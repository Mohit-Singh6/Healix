import { createErrorLogWithVector, findSimilarRecentErrors } from "./error-repo";
import { generateErrorEmbedding } from "./embedding";
import { prisma } from "./prisma";
import type { IncidentSeverity } from "@prisma/client";

export interface ErrorLogInput {
    projectId: string;
    serviceName: string;
    message: string;
    stackTrace: string;
    statusCode?: number | null;
    endpoint?: string | null;
}

export interface DeduplicationResult {
    errorLogId: string;
    incidentId: string;
    isNewIncident: boolean;
}

async function createNewIncident(params: {
    projectId: string;
    title: string;
    severity?: IncidentSeverity;
}): Promise<string> {
    const incident = await prisma.incident.create({
        data: {
            projectId: params.projectId,
            title: params.title.slice(0, 255), // Guard against excessively long error messages
            status: "INVESTIGATING",
            severity: params.severity ?? "SEV2",
        },
    });

    return incident.id;
}

/**
 * Intercepts incoming errors, checks cosine similarity against recent logs,
 * and clusters duplicates under the same active incident.
 */
export async function deduplicateErrorLog(
    err: ErrorLogInput
): Promise<DeduplicationResult> {
    // 1. Generate 768-d embedding
    const embedding = await generateErrorEmbedding({
        serviceName: err.serviceName,
        message: err.message,
        stackTrace: err.stackTrace,
    });

    // 2. Look for errors in the last 15 minutes with >= 88% similarity
    const similarErrors = await findSimilarRecentErrors(
        err.projectId,
        embedding,
        15,    // 15-minute lookback window
        0.88   // 88% similarity threshold
    );

    let targetIncidentId = similarErrors[0]?.incidentId;
    let isNewIncident = false;

    // 3. Fallback: If no match or the matched error had no linked incident
    if (!targetIncidentId) {
        targetIncidentId = await createNewIncident({
            projectId: err.projectId,
            title: `[${err.serviceName}] ${err.message}`,
        });
        isNewIncident = true;
    }

    // 4. Record the log with vector embedding attached to the resolved incident
    const errorLogId = await createErrorLogWithVector({
        ...err,
        embedding,
        incidentId: targetIncidentId,
    });

    return {
        errorLogId,
        incidentId: targetIncidentId,
        isNewIncident,
    };
}