import type { IncidentAgentState, IncidentAgentUpdate } from "../state";
import { Octokit } from "@octokit/rest";
import { GoogleGenAI, Type } from "@google/genai";
import { prisma } from "../../lib/prisma";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
const owner = process.env.GITHUB_OWNER || "";
const repo = process.env.GITHUB_REPO || "";

export async function executeRemediationNode(
  state: IncidentAgentState
): Promise<IncidentAgentUpdate> {
  console.log(`[Node E: ExecuteRemediation] Processing action: ${state.proposedAction}`);

  let prUrl: string | null = null;

  // 1. Automated GitHub Revert Flow
  if (state.humanApprovalStatus === "APPROVED" && state.proposedAction === "REVERT_PR") {
    const targetSha = state.actionPayload?.targetCommitSha as string;

    if (targetSha && owner && repo) {
      try {
        // Fetch default branch
        const { data: repoData } = await octokit.rest.repos.get({ owner, repo });
        const defaultBranch = repoData.default_branch; // e.g., 'main'

        // Get latest commit SHA on the default branch
        const { data: refData } = await octokit.rest.git.getRef({
          owner,
          repo,
          ref: `heads/${defaultBranch}`,
        });
        const baseSha = refData.object.sha;

        // Create a remediation branch off HEAD (it means the revert will be based on the latest state of the default branch)
        const branchName = `healix/revert-${targetSha.slice(0, 7)}-${Date.now()}`;
        await octokit.rest.git.createRef({
          owner,
          repo,
          ref: `refs/heads/${branchName}`,
          sha: baseSha,
        });

        // Open Pull Request proposing the revert
        const { data: pr } = await octokit.rest.pulls.create({
          owner,
          repo,
          title: `[Healix Auto-Remediation] Revert culprit commit ${targetSha.slice(0, 7)}`,
          head: branchName,
          base: defaultBranch,
          body: `## Autonomous Incident Remediation\n\n**Triggered by Incident:** \`${state.incidentId}\`\n**Target Culprit Commit:** \`${targetSha}\`\n\n### Root Cause Analysis:\n${state.hypothesis}\n\n*Approved by operator: ${state.humanDecision?.reviewedBy || "operator"}*`,
        });

        prUrl = pr.html_url;
        console.log(`[Node E] Remediation PR created: ${prUrl}`);
      } catch (err) {
        console.error("[Node E] Failed to create GitHub revert PR:", err);
      }
    }
  }
  else if (state.humanApprovalStatus === "APPROVED" && state.proposedAction === "APPLY_CONFIG_PATCH") {
    // Placeholder for future automated config patching logic
    console.log(`[Node E] Config patching is not yet implemented. Manual intervention required.`);
  }

  // 2. Format Commits and Logs to avoid "[object Object]"
  const formattedCommits = state.candidateCommits.length > 0
    ? state.candidateCommits.map((c) => `SHA: ${c.sha}\nAuthor: ${c.author}\nDiff:\n${c.diff}`).join("\n---\n")
    : "No recent candidate commits.";

  const formattedLogs = state.correlatedLogs.length > 0
    ? state.correlatedLogs.join("\n")
    : "No correlated logs.";

  const systemPrompt = `
You are an expert site reliability engineer drafting an official post-mortem incident report.

INCIDENT CONTEXT:
Service: ${state.serviceName}
Error Title: ${state.errorMessage}
Stack Trace:
${state.stackTrace}

CORRELATED LOGS:
${formattedLogs}

SUSPECT COMMITS:
${formattedCommits}

DIAGNOSTIC HYPOTHESIS:
${state.hypothesis}

OPERATOR REVIEW DECISION:
Status: ${state.humanApprovalStatus}
Feedback: ${state.humanDecision?.feedback || "None"}
Remediation PR: ${prUrl || "No automated PR opened"}

TASK:
Generate a thorough, production-grade Post-Mortem report.
Return JSON matching the schema with:
- title: A concise incident title.
- summary: Executive summary highlighting blast radius and service impact.
- rootCause: Technical failure mechanism.
- mitigationSteps: Concrete mitigation steps taken.
- markdownContent: The complete formatted markdown report with clear headings (Executive Summary, Timeline, Root Cause, Mitigation, Preventative Recommendations).
`;

  // 3. Generate Post-Mortem with Gemini
  const response = await ai.models.generateContent({
    model: "gemini-1.5-flash",
    contents: systemPrompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          summary: { type: Type.STRING },
          rootCause: { type: Type.STRING },
          mitigationSteps: { type: Type.STRING },
          markdownContent: { type: Type.STRING },
        },
        required: ["title", "summary", "rootCause", "mitigationSteps", "markdownContent"],
      },
    },
  });

  const parsed = JSON.parse(response.text || "{}") as {
    title: string;
    summary: string;
    rootCause: string;
    mitigationSteps: string;
    markdownContent: string;
  };

  // 4. Finalize state in Neon DB
  const finalStatus = state.humanApprovalStatus === "APPROVED" ? "RESOLVED" : "DISMISSED";

  await prisma.incident.update({
    where: { id: state.incidentId },
    data: {
      status: finalStatus,
      revertPrUrl: prUrl,
    },
  });

  await prisma.postMortem.upsert({
    where: { incidentId: state.incidentId },
    update: {
      summary: parsed.summary,
      rootCause: parsed.rootCause,
      mitigationSteps: parsed.mitigationSteps,
      fullMarkdown: parsed.markdownContent,
    },
    create: {
      incidentId: state.incidentId,
      summary: parsed.summary,
      rootCause: parsed.rootCause,
      mitigationSteps: parsed.mitigationSteps,
      fullMarkdown: parsed.markdownContent,
    },
  });

  return {
    revertPrUrl: prUrl || undefined,
    postMortemMarkdown: parsed.markdownContent,
  };
}