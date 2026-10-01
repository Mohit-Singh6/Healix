import { prisma } from "@/src/lib/prisma";
import { createId } from "@paralleldrive/cuid2"; // or crypto.randomUUID()

export interface CreateErrorLogParams {
  projectId: string;
  incidentId?: string | null;
  serviceName: string;
  message: string;
  stackTrace: string;
  statusCode?: number | null;
  endpoint?: string | null;
  embedding: number[]; // 768-dimension array from Gemini
}

export interface SimilarErrorMatch {
  id: string;
  incidentId: string | null;
  serviceName: string;
  message: string;
  stackTrace: string;
  similarity: number; // Value between 0 and 1
  createdAt: Date;
}

/**
 * 1. Insert Helper: Uses raw SQL to cast the number array into Postgres ::vector
 */
export async function createErrorLogWithVector(params: CreateErrorLogParams): Promise<string> {
  const id = createId(); // or use crypto.randomUUID()
  const vectorString = JSON.stringify(params.embedding); // Why use JSON.stringify here? Answer in doubt3

  await prisma.$executeRaw`
    INSERT INTO "ErrorLog" (
      "id",
      "projectId",
      "incidentId",
      "serviceName",
      "message",
      "stackTrace",
      "statusCode",
      "endpoint",
      "embedding",
      "createdAt"
    ) VALUES (
      ${id},
      ${params.projectId},${params.incidentId ?? null},
      ${params.serviceName},${params.message},
      ${params.stackTrace},${params.statusCode ?? null},
      ${params.endpoint ?? null},
      ${vectorString}::vector,
      NOW()
    );
  `;

  return id;
}

/**
 * 2. Similarity Search Helper: Finds errors in the same project within a time window
 *    ordered by cosine proximity.
 */
export async function findSimilarRecentErrors(
  projectId: string,
  embedding: number[],
  lookbackMinutes = 15,
  similarityThreshold = 0.85,
  limit = 5
): Promise<SimilarErrorMatch[]> {
    
  const vectorString = JSON.stringify(embedding);
  
  // Cosine distance operator is <=>
  // Cosine similarity = 1 - distance
  // Therefore: distance < (1 - similarityThreshold)
  const maxDistance = 1 - similarityThreshold;
  const timeCutoff = new Date(Date.now() - lookbackMinutes * 60 * 1000);

  const matches = await prisma.$queryRaw<
    Array<{
      id: string;
      incidentId: string | null;
      serviceName: string;
      message: string;
      stackTrace: string;
      similarity: number;
      createdAt: Date;
    }> // the entire point of writing this array thing is to specify the return type of the query, so that TypeScript knows what to expect and doesn't throw type errors when we access the properties of the returned objects
  >`
    SELECT 
      "id",
      "incidentId",
      "serviceName",
      "message",
      "stackTrace",
      "createdAt",
      1 - ("embedding" <=> ${vectorString}::vector) AS "similarity"
    FROM "ErrorLog"
    WHERE "projectId" = ${projectId}
      AND "createdAt" >= ${timeCutoff}
      AND ("embedding" <=> ${vectorString}::vector) <=${maxDistance}
    ORDER BY "embedding" <=> ${vectorString}::vector ASC
    LIMIT ${limit};
  `;

  return matches;
}