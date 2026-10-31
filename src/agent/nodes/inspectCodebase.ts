import { Octokit } from "@octokit/rest";
import type { IncidentAgentState, IncidentAgentUpdate, CandidateCommit } from "../state";
import { prisma } from "../../lib/prisma";
import { decryptProjectSecret } from "../../lib/project-secrets";

/**
 * Extracts candidate source file paths from a raw stack trace.
 * Matches common patterns: (src/foo.ts:12:34), (/app/src/foo.js:10:5), etc.
 */
function extractFilesFromStackTrace(stackTrace: string): string[] {
  const fileRegex = /(?:at\s+.*?\s+\(?|\()([a-zA-Z0-9_\-./\\]+\.[a-zA-Z0-9]+):\d+:\d+\)?/g;
  const files = new Set<string>();
  let match: RegExpExecArray | null;

  while ((match = fileRegex.exec(stackTrace)) !== null) {
    let rawPath = match[1].replace(/\\/g, "/"); // Normalize Windows backslashes

    // Filter out node internals, bundles, and vendor packages
    if (
      !rawPath.startsWith("node:") &&
      !rawPath.includes("node_modules") &&
      !rawPath.includes(".next")
    ) {
      // Strip common container root prefixes like /app/ or /workspace/
      rawPath = rawPath.replace(/^\/(?:app|workspace|usr\/src\/app)\//, "");
      files.add(rawPath);
    }
  }

  return Array.from(files);
}

export async function inspectCodebaseNode(
  state: IncidentAgentState
): Promise<IncidentAgentUpdate> {
  console.log(`[Node B: InspectCodebase] Analyzing stack trace for changed files...`);

  const incident = await prisma.incident.findUnique({
    where: { id: state.incidentId },
    include: { project: true },
  });

  const owner = incident?.project?.repoOwner;
  const repo = incident?.project?.repoName;
  const token = incident?.project?.githubToken
    ? decryptProjectSecret(incident.project.githubToken)
    : process.env.GITHUB_TOKEN;

  if (!token || !owner || !repo) {
    console.warn(`[Node B] GitHub credentials not fully configured. Skipping git inspection.`);
    return { candidateCommits: [] };
  }

  const octokit = new Octokit({ auth: token });
  const impactedFiles = extractFilesFromStackTrace(state.stackTrace || "");
  console.log(`[Node B] Extracted files from stack trace:`, impactedFiles);

  // Default search range: last 24 hours
  const sinceDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  try {
    // 1. Fetch recent commits (cap at 8 to protect rate limits & latency)
    const { data: recentCommits } = await octokit.repos.listCommits({
      owner,
      repo,
      since: sinceDate,
      per_page: 8,
    });

    if (recentCommits.length === 0) {
      console.log(`[Node B] No commits merged in the last 24 hours.`);
      return { candidateCommits: [] };
    }

    // 2. Concurrently fetch full commit data to get files and diffs
    const commitDetails = await Promise.all(
      recentCommits.map(async (c) => {
        try {
          const { data } = await octokit.repos.getCommit({
            owner,
            repo,
            ref: c.sha,
          });
          return data;
        } catch (err) {
          console.warn(`[Node B] Failed to fetch commit details for ${c.sha.slice(0, 7)}:`, err);
          return null;
        }
      })
    );

    const candidateCommits: CandidateCommit[] = [];

    for (const fullCommit of commitDetails) {
      if (!fullCommit) continue;

      const commitFiles = fullCommit.files?.map((f) => f.filename) || [];

      // Check for file overlap with stack trace
      let isRelevant = false;

      if (impactedFiles.length > 0) {
        isRelevant = impactedFiles.some((traceFile) =>
          commitFiles.some(
            (repoFile) => repoFile.endsWith(traceFile) || traceFile.endsWith(repoFile)
          )
        );
      } else {
        // Fallback: If stack trace lacked clean file paths, only evaluate the most recent 2 commits
        isRelevant = candidateCommits.length < 2;
      }

      if (isRelevant) {
        const diffAggregated = (fullCommit.files || [])
          .map(
            (f) =>
              `--- ${f.filename}\n+++ ${f.filename}\n${f.patch || "(binary or large diff omitted)"}`
          )
          .join("\n\n");

        candidateCommits.push({
          sha: fullCommit.sha,
          message: fullCommit.commit.message,
          author: fullCommit.commit.author?.name || undefined,
          date: fullCommit.commit.author?.date || undefined,
          filesChanged: commitFiles,
          diff: diffAggregated.slice(0, 10000), // Protect Gemini context window
        });
      }
    }

    console.log(`[Node B] Identified ${candidateCommits.length} candidate culprit commits.`);
    return { candidateCommits };
  } catch (error) {
    console.error(`[Node B] Error during Octokit git analysis:`, error);
    return { candidateCommits: [] };
  }
}