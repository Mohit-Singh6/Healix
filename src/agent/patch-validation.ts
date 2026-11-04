import type { IncidentAgentState } from "./state";

function normalizePath(value: string): string {
  return value.replace(/\\/g, "/").replace(/^\.?\//, "").toLowerCase();
}

function sameFilePath(left: string, right: string): boolean {
  const first = normalizePath(left);
  const second = normalizePath(right);
  return first === second || first.endsWith(`/${second}`) || second.endsWith(`/${first}`);
}

export function hasIncidentFileEvidence(
  state: Pick<IncidentAgentState, "stackTrace" | "candidateCommits" | "inspectedFiles">,
  targetFilePath: string | undefined,
): boolean {
  if (!targetFilePath?.trim()) return false;

  const target = normalizePath(targetFilePath.trim());
  const appearsInInspectedFiles = state.inspectedFiles.some((file) =>
    sameFilePath(file.path, target),
  );
  if (appearsInInspectedFiles) return true;

  const trace = normalizePath(state.stackTrace);
  const appearsInStackTrace =
    trace.includes(`/${target}:`) ||
    trace.includes(`/${target})`) ||
    trace.includes(`/${target} `) ||
    trace.startsWith(`${target}:`) ||
    trace.startsWith(`${target})`) ||
    trace.startsWith(`${target} `);
  const appearsInRelevantCommit = state.candidateCommits.some((commit) =>
    commit.filesChanged.some((filePath) => sameFilePath(filePath, target)),
  );

  return appearsInStackTrace || appearsInRelevantCommit;
}