import { Octokit } from "@octokit/rest";
import type { IncidentAgentState, IncidentAgentUpdate, CandidateCommit } from "../state";
import { prisma } from "../../lib/prisma";
import { decryptProjectSecret } from "../../lib/project-secrets";


// Too much detailed filtering logic here, but the goal is to extract file paths from stack traces while ignoring irrelevant lines and normalizing paths.

// Valid source code extensions to retain
const VALID_EXTENSIONS = new Set([
  "js", "jsx", "ts", "tsx", "mjs", "cjs", "vue", "svelte", "py", "go", "rs", "java"
]);

// Ignored runtime internals, third-party folders, and virtual engines
const IGNORED_SEGMENTS = [
  "node_modules",
  "node:internal",
  "node:",
  "<anonymous>",
  "internal/process",
  "internal/modules",
  "next/dist",
  "@prisma/client",
  "bullmq",
  "ioredis",
  "express/lib",
];

// Common production deployment root directory prefixes to strip
const DEPLOYMENT_ROOT_PREFIXES = [
  // Render / Koyeb / Docker
  /^\/opt\/render\/project\/src\//,
  /^\/opt\/render\/project\//,
  /^\/app\//,
  /^\/workspace\//,
  /^\/var\/task\//,         // AWS Lambda / Vercel Serverless
  /^\/vercel\/path0\//,     // Vercel build output
  // Windows absolute paths (e.g. D:\Projects\healix\ or C:\Users\...)
  /^[a-zA-Z]:[\\/](?:[^\\/]+[\\/])*?(?=(?:backend|frontend|src|app|pages|lib|server|client)[\\/])/i,
  /^[a-zA-Z]:[\\/]/,
];

export function extractFilesFromStackTrace(stackTrace: string): string[] {
  if (!stackTrace || typeof stackTrace !== "string") return [];

  const matches: string[] = [];
  const lines = stackTrace.split("\n");

  // Captures file paths inside "at ... (/path/to/file.ts:10:5)" or "at /path/to/file.ts:10:5"
  // Handles: file:///, webpack-internal:///, plain Unix paths, and Windows drive letters
  const frameRegex = /(?:at\s+(?:.*?\s+\()?)?(?:file:\/\/+)?(?:webpack-internal:\/\/\/(?:\([a-z-]+\)\/)?)?((?:[a-zA-Z]:[\\/]|[\\/]|[a-zA-Z0-9_.\-]+[\\/])[^\s:?#()]+?\.[a-zA-Z0-9]+)(?::\d+)*(?:\?[^\s:()]+)?\)?/;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    // Fast bail out on obvious runtime / dependency lines
    if (IGNORED_SEGMENTS.some((segment) => line.includes(segment))) {
      continue;
    }

    const match = line.match(frameRegex);
    if (!match || !match[1]) continue;

    let candidatePath = match[1].trim();

    // 1. Remove file:// protocol if present
    candidatePath = candidatePath.replace(/^file:\/\/+/, "");

    // 2. Normalize Windows backslashes to standard posix forward slashes
    candidatePath = candidatePath.replace(/\\/g, "/");

    // 3. Remove URL query params / cachebusters (e.g. route.ts?t=1700000)
    candidatePath = candidatePath.split("?")[0].split("#")[0];

    // 4. Verify extension validity
    const ext = candidatePath.split(".").pop()?.toLowerCase();
    if (!ext || !VALID_EXTENSIONS.has(ext)) {
      continue;
    }

    // 5. Strip deployment roots and cloud container mount paths
    for (const prefix of DEPLOYMENT_ROOT_PREFIXES) {
      if (prefix.test(candidatePath)) {
        candidatePath = candidatePath.replace(prefix, "");
        break;
      }
    }

    // 6. Anchor to project root if anchored inside known directories
    // E.g., "/some/deep/nested/path/backend/server.js" -> "backend/server.js"
    const rootDirMatch = candidatePath.match(/(?:^|\/)((?:backend|frontend|src|app|pages|lib|server|client)\/.*)$/);
    if (rootDirMatch && rootDirMatch[1]) {
      candidatePath = rootDirMatch[1];
    } else {
      // Clean leading slashes
      candidatePath = candidatePath.replace(/^\/+/, "");
    }

    // 7. Ignore if root folder normalization resulted in empty string or standard third-party files
    if (!candidatePath || candidatePath.includes("node_modules")) {
      continue;
    }

    // 8. Deduplicate while preserving stack priority order (top frames first)
    if (!matches.includes(candidatePath)) {
      matches.push(candidatePath);
    }
  }

  return matches;
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