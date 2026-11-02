import { Octokit } from "@octokit/rest";
import type { IncidentAgentState, IncidentAgentUpdate, CandidateCommitMeta } from "../state";
import { fastClassifySuspectFiles } from "../groq";
import { prisma } from "../../lib/prisma";
import { decryptProjectSecret } from "../../lib/project-secrets";

const SOURCE_EXTENSIONS = new Set([
  "js", "jsx", "ts", "tsx", "mjs", "cjs", "vue", "svelte", "py", "go", "rs", "java",
]);
const MAX_INSPECTED_FILES = 5;
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

function stackTraceMatchesFile(stackTrace: string, filePath: string): boolean {
  if (/\.min\.[^/]+$/i.test(filePath)) return false;
  const normalizedTrace = stackTrace.replace(/\\/g, "/").toLowerCase();
  return normalizedTrace.includes(filePath.replace(/\\/g, "/").toLowerCase());
}

function endpointMatchScore(endpoint: string | undefined, filePath: string): number {
  if (!endpoint) return 0;

  let pathname = endpoint;
  try {
    pathname = new URL(endpoint, "https://healix.invalid").pathname;
  } catch {
    pathname = endpoint.split("?")[0];
  }

  const routeSegments = pathname
    .split("/")
    .filter((segment) => segment.length > 1 && !/^api$/i.test(segment))
    .map((segment) => segment.toLowerCase());
  const fileSegments = filePath.replace(/\\/g, "/").toLowerCase().split("/");
  return routeSegments.filter((segment) =>
    fileSegments.some((fileSegment) => fileSegment.replace(/\.[^.]+$/, "") === segment),
  ).length;
}

function selectSuspectFiles(
  candidateFiles: string[],
  state: IncidentAgentState,
): Promise<string[]> {
  if (candidateFiles.length <= MAX_INSPECTED_FILES) return Promise.resolve(candidateFiles);

  const stackMatches = candidateFiles.filter((filePath) =>
    stackTraceMatchesFile(state.stackTrace, filePath),
  );
  const routeMatches = candidateFiles
    .map((filePath) => ({ filePath, score: endpointMatchScore(state.endpoint, filePath) }))
    .filter((candidate) => candidate.score > 0)
    .sort((left, right) => right.score - left.score)
    .map((candidate) => candidate.filePath);
  const prioritizedFiles = [...new Set([...stackMatches, ...routeMatches])].slice(0, MAX_INSPECTED_FILES);
  const remainingFiles = candidateFiles.filter((filePath) => !prioritizedFiles.includes(filePath));
  const availableSlots = MAX_INSPECTED_FILES - prioritizedFiles.length;

  return fastClassifySuspectFiles({
    errorMessage: state.errorMessage,
    endpoint: state.endpoint,
    stackTrace: state.stackTrace,
    candidateFiles: remainingFiles,
  }).then((classifiedFiles) =>
    [...prioritizedFiles, ...classifiedFiles.slice(0, availableSlots)].slice(0, MAX_INSPECTED_FILES),
  );
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
