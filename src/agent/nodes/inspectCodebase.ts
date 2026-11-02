import { Octokit } from "@octokit/rest";
import type { IncidentAgentState, IncidentAgentUpdate, CandidateCommitMeta } from "../state";
import { fastClassifySuspectFiles } from "../groq";
import { prisma } from "../../lib/prisma";
import { decryptProjectSecret } from "../../lib/project-secrets";

const SOURCE_EXTENSIONS = new Set([
  "js", "jsx", "ts", "tsx", "mjs", "cjs", "vue", "svelte", "py", "go", "rs", "java",
]);
const MAX_INSPECTED_FILES = 7;
const MAX_FILE_LINES = 400;

function isSourceFile(path: string): boolean {
  const normalizedPath = path.replace(/\\/g, "/").toLowerCase();
  const fileName = normalizedPath.split("/").pop() ?? normalizedPath;
  if (
    normalizedPath.includes("/.github/") ||
    normalizedPath.startsWith(".github/") ||
    fileName.startsWith(".env") ||
    fileName === "dockerfile" ||
    fileName === ".gitignore" ||
    fileName === ".dockerignore" ||
    fileName === "package-lock.json" ||
    fileName === "pnpm-lock.yaml" ||
    fileName === "yarn.lock" ||
    fileName === "bun.lockb"
  ) {
    return false;
  }

  const extension = fileName.split(".").pop();
  return extension !== undefined && SOURCE_EXTENSIONS.has(extension);
}

export function scoreAndRankCandidateFiles(params: {
  candidateFiles: string[];
  endpoint?: string;
  errorMessage: string;
  stackTrace: string;
}): string[] {
  const { candidateFiles, endpoint, errorMessage, stackTrace } = params;
  const stopWords = new Set(["api", "v1", "v2", "index"]);
  const routeTokens = (endpoint ?? "")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length > 0 && !stopWords.has(token));
  const lowerStackTrace = stackTrace.toLowerCase().replace(/\\/g, "/");
  const lowerErrorMessage = errorMessage.toLowerCase();
  const propertyClues = [...lowerErrorMessage.matchAll(/(?:reading|property)\s+['"]([^'"]+)['"]/g)]
    .map((match) => match[1].toLowerCase().replace(/[^a-z0-9]/g, ""))
    .filter(Boolean);
  const testFilePattern = /(?:^|\/)__tests__(?:\/|$)|(?:^|\/)__mocks__(?:\/|$)|\.(?:spec|test|stories)\.[^/]+$/i;

  return candidateFiles
    .map((filePath, index) => {
      const lowerPath = filePath.toLowerCase().replace(/\\/g, "/");
      const pathSegments = lowerPath.split("/").filter(Boolean);
      const normalizedSegments = pathSegments.map((segment) => segment.replace(/\.[^.]+$/, ""));
      let score = 0;

      for (const token of routeTokens) {
        if (lowerPath.includes(token)) score += 30;
      }

      if (normalizedSegments.some((segment) => lowerStackTrace.includes(segment))) score += 40;
      if (
        propertyClues.some((property) =>
          normalizedSegments.some((segment) => segment.includes(property)),
        )
      ) {
        score += 15;
      }
      if (testFilePattern.test(lowerPath)) score -= 40;

      return { filePath, index, score };
    })
    .sort((left, right) => right.score - left.score || left.index - right.index)
    .map(({ filePath }) => filePath);
}

function selectSuspectFiles(
  candidateFiles: string[],
  state: IncidentAgentState,
): Promise<string[]> {
  const rankedFiles = scoreAndRankCandidateFiles({
    candidateFiles,
    endpoint: state.endpoint,
    errorMessage: state.errorMessage,
    stackTrace: state.stackTrace,
  });
  return fastClassifySuspectFiles({
    errorMessage: state.errorMessage,
    endpoint: state.endpoint,
    stackTrace: state.stackTrace,
    candidateFiles: rankedFiles,
  }).then((classifiedFiles) => classifiedFiles.slice(0, MAX_INSPECTED_FILES));
}

function decodeFileContent(encodedContent: string): string {
  return Buffer.from(encodedContent.replace(/\s/g, ""), "base64").toString("utf8");
}

function applyLineBudget(content: string, filePath: string): string {
  const lines = content.split(/\r?\n/);
  if (lines.length <= MAX_FILE_LINES) return content;

  console.warn(`[Node B] Truncating ${filePath} to ${MAX_FILE_LINES} lines for diagnosis context.`);
  return `${lines.slice(0, MAX_FILE_LINES).join("\n")}\n// [Content truncated by Healix ingestor due to length]`;
}

export async function inspectCodebaseNode(
  state: IncidentAgentState,
): Promise<IncidentAgentUpdate> {
  console.log("[Node B: InspectCodebase] Building the recent-commit blast radius...");

  const incident = await prisma.incident.findUnique({
    where: { id: state.incidentId },
    include: { project: true },
  });
  if (!incident?.project) {
    throw new Error(`[Node B] Cannot inspect code: project for incident ${state.incidentId} was not found.`);
  }

  const project = incident.project;
  if (!project.githubToken) {
    throw new Error(`[Node B] Cannot inspect code for project ${project.name}: no GitHub token is configured.`);
  }

  const token = decryptProjectSecret(project.githubToken);
  const { repoOwner: owner, repoName: repo } = project;
  const octokit = new Octokit({ auth: token });
  let defaultBranch = project.defaultBranch;
  if (!defaultBranch) {
    const { data: repository } = await octokit.rest.repos.get({ owner, repo });
    defaultBranch = repository.default_branch;
  }

  const { data: recentCommits } = await octokit.rest.repos.listCommits({
    owner,
    repo,
    sha: defaultBranch,
    per_page: 6,
  });
  const commitDetails = await Promise.all(
    recentCommits.map(async (commit) => {
      try {
        const { data } = await octokit.rest.repos.getCommit({
          owner,
          repo,
          ref: commit.sha,
        });
        return data;
      } catch (error) {
        console.warn(`[Node B] Could not load commit ${commit.sha.slice(0, 7)}; skipping it.`, error);
        return null;
      }
    }),
  );

  const candidateCommits: CandidateCommitMeta[] = [];
  const candidateFiles = new Set<string>();

  for (const commit of commitDetails) {
    if (!commit) continue;

    const files = commit.files ?? [];
    const filesChanged = [...new Set(files.flatMap((file) =>
      [file.filename, file.previous_filename].filter((path): path is string => Boolean(path)),
    ))];
    const diff = files
      .map((file) => `--- ${file.filename}\n+++ ${file.filename}\n${file.patch ?? "(patch unavailable)"}`)
      .join("\n\n")
      .slice(0, 10000);

    candidateCommits.push({
      sha: commit.sha,
      author: commit.author?.login ?? commit.commit.author?.name ?? "Unknown",
      message: commit.commit.message,
      date: commit.commit.author?.date ?? commit.commit.committer?.date ?? "",
      filesChanged,
      diff,
    });

    for (const file of files) {
      if (file.status !== "removed" && isSourceFile(file.filename)) {
        candidateFiles.add(file.filename);
      }
    }
  }

  const sourceFiles = [...candidateFiles];
  const prioritizedFiles = await selectSuspectFiles(sourceFiles, state);
  const inspectedFiles: NonNullable<IncidentAgentUpdate["inspectedFiles"]> = [];

  for (const path of prioritizedFiles) {
    try {
      const { data } = await octokit.rest.repos.getContent({
        owner,
        repo,
        path,
        ref: defaultBranch,
      });
      if (Array.isArray(data) || data.type !== "file" || !("content" in data) || data.encoding !== "base64") {
        console.warn(`[Node B] Skipping ${path}: GitHub did not return a regular file.`);
        continue;
      }

      inspectedFiles.push({
        path,
        content: applyLineBudget(decodeFileContent(data.content), path),
      });
    } catch (error) {
      console.warn(`[Node B] Could not hydrate ${path} from ${defaultBranch}; skipping it.`, error);
    }
  }

  console.log(`[Node B] Selected ${candidateCommits.length} commits and hydrated ${inspectedFiles.length} source files.`);
  return { candidateCommits, inspectedFiles };
}
