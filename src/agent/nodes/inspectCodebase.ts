import { Octokit } from "@octokit/rest";
import type { IncidentAgentState, IncidentAgentUpdate, CandidateCommit } from "../state";

const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
const owner = process.env.GITHUB_OWNER || "";
const repo = process.env.GITHUB_REPO || "";

/**
 * Extracts candidate source file paths from a raw stack trace.
 * Matches common patterns: (src/foo.ts:12:34), (/app/src/foo.js:10:5), etc.
 */
function extractFilesFromStackTrace(stackTrace: string): string[] {
  const fileRegex = /(?:at\s+.*?\s+\(?|\()([a-zA-Z0-9_\-./]+\.[a-zA-Z]{2,4}):\d+:\d+\)?/g;
  const files = new Set<string>();
  let match: RegExpExecArray | null;

  while ((match = fileRegex.exec(stackTrace)) !== null) {
    const rawPath = match[1];
    // Filter out node internals or generic node_modules if you want only source code
    if (!rawPath.startsWith("node:") && !rawPath.includes("node_modules")) {
      files.add(rawPath);
    }
  }

  return Array.from(files);
}

export async function inspectCodebaseNode(
  state: IncidentAgentState
): Promise<IncidentAgentUpdate> {
  console.log(`[Node B: InspectCodebase] Analyzing stack trace for changed files...`);

  if (!process.env.GITHUB_TOKEN || !owner || !repo) {
    console.warn(`[Node B] GitHub credentials not fully configured. Skipping git inspection.`);
    return { candidateCommits: [] };
  }

  const impactedFiles = extractFilesFromStackTrace(state.stackTrace);
  console.log(`[Node B] Extracted files from stack trace:`, impactedFiles);

  // Default search range: last 24 hours
  const sinceDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  try {
    const { data: recentCommits } = await octokit.repos.listCommits({
      owner,
      repo,
      since: sinceDate,
      per_page: 20,
    });

    const candidateCommits: CandidateCommit[] = [];

    for (const commitSummary of recentCommits) {
      // Fetch full commit details to get modified file list and patch diffs
      const { data: fullCommit } = await octokit.repos.getCommit({
        owner,
        repo,
        ref: commitSummary.sha,
      });

      const commitFiles = fullCommit.files?.map((f) => f.filename) || [];

      // Check if this commit modified any file that appears in the stack trace
      const hasIntersection =
        impactedFiles.length === 0 ||
        impactedFiles.some((f) => commitFiles.some((cf) => cf.endsWith(f) || f.endsWith(cf)));

      if (hasIntersection) {
        // Collect aggregated diffs from all touched files in this commit
        const diffAggregated = (fullCommit.files || [])
          .map((f) => `--- ${f.filename}\n+++ ${f.filename}\n${f.patch || "(binary or large diff)"}`)
          .join("\n\n");

        candidateCommits.push({
          sha: fullCommit.sha,
          message: fullCommit.commit.message,
          author: fullCommit.commit.author?.name || undefined,
          date: fullCommit.commit.author?.date || undefined,
          filesChanged: commitFiles,
          diff: diffAggregated.slice(0, 10000), // Protect against context window overflow
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
