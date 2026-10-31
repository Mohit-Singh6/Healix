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
  else if (state.humanApprovalStatus === "APPROVED" && state.proposedAction === "BUGFIX_PR") {
    console.log(`[Node E] Processing automated bugfix PR...`);

    const targetFilePath = state.actionPayload?.targetFilePath as string;
    const patchMode = state.actionPayload?.patchMode;
    const targetSha = state.actionPayload?.targetCommitSha as string | undefined;

    if (targetFilePath && owner && repo) {
      try {
        // 1. Fetch default branch and latest HEAD SHA
        const { data: repoData } = await octokit.rest.repos.get({ owner, repo });
        const defaultBranch = repoData.default_branch;

        const { data: refData } = await octokit.rest.git.getRef({
          owner,
          repo,
          ref: `heads/${defaultBranch}`,
        });
        const baseSha = refData.object.sha;

        // 2. Create an isolated remediation branch off default branch HEAD
        const branchIdentifier = targetSha ? targetSha.slice(0, 7) : Date.now().toString().slice(-6);
        const branchName = `healix/fix-${branchIdentifier}-${Date.now()}`;
        
        await octokit.rest.git.createRef({
          owner,
          repo,
          ref: `refs/heads/${branchName}`,
          sha: baseSha,
        });

        // 3. Fetch existing file contents and blob SHA
        const { data: fileData } = await octokit.rest.repos.getContent({
          owner,
          repo,
          path: targetFilePath,
          ref: branchName,
        });

        if (Array.isArray(fileData) || fileData.type !== "file" || !("content" in fileData)) {
          throw new Error(`Target path '${targetFilePath}' is not a valid single file.`);
        }

        const currentSha = fileData.sha;
        const rawContent = Buffer.from(fileData.content, "base64").toString("utf-8");
        let patchedContent: string | null = null;

        // 4. Compute updated code based on patchMode
        if (patchMode === "FULL_FILE") {
          patchedContent = state.actionPayload?.patchedFileContent as string;
        } 
        else if (patchMode === "SEARCH_REPLACE") {
          const replacements = state.actionPayload?.replacements;

          if (!replacements || !Array.isArray(replacements) || replacements.length === 0) {
            throw new Error(
              `[Node E] patchMode is SEARCH_REPLACE, but 'replacements' array is missing or empty.`
            );
          }

          let updated = rawContent;

          for (let i = 0; i < replacements.length; i++) {
            const { searchBlock, replaceBlock } = replacements[i];

            if (!searchBlock || typeof replaceBlock !== "string") {
              throw new Error(
                `[Node E] Invalid replacement entry at index ${i}: searchBlock and replaceBlock must be defined strings.`
              );
            }

            if (!updated.includes(searchBlock)) {
              throw new Error(
                `[Node E] Replacement block #${i + 1} not found in ${targetFilePath}. Snippet: "${searchBlock.slice(0, 60)}..."`
              );
            }

            // Replace the exact matching instance
            updated = updated.replace(searchBlock, replaceBlock);
          }

          patchedContent = updated;
        }

        if (!patchedContent) {
          throw new Error(`Unable to compute patched content for mode '${patchMode}'.`);
        }

        // 5. Commit modified file to the remediation branch
        await octokit.rest.repos.createOrUpdateFileContents({
          owner,
          repo,
          path: targetFilePath,
          branch: branchName,
          message: `fix(healix): apply automated bugfix for ${targetFilePath}`,
          content: Buffer.from(patchedContent).toString("base64"),
          sha: currentSha,
        });

        // 6. Open the Pull Request
        const { data: pr } = await octokit.rest.pulls.create({
          owner,
          repo,
          title: `[Healix Auto-Fix] Resolve issue in ${targetFilePath}`,
          head: branchName,
          base: defaultBranch,
          body: `## Autonomous Bugfix Remediation\n\n**Incident ID:** \`${state.incidentId}\`\n**Target File:** \`${targetFilePath}\`\n\n### Root Cause Analysis:\n${state.hypothesis}\n\n*Approved by operator: ${state.humanDecision?.reviewedBy || "operator"}*`,
        });

        prUrl = pr.html_url;
        console.log(`[Node E] Remediation PR created: ${prUrl}`);
      } catch (err) {
        console.error("[Node E] Failed to execute bugfix remediation:", err);
      }
    }
  }
  else if (state.humanApprovalStatus === "APPROVED" && state.proposedAction === "APPLY_CONFIG_PATCH") {
    console.log(`[Node E] Processing automated configuration patch...`);

    const configKey = state.actionPayload?.configKey as string;
    const configValue = state.actionPayload?.configValue as string;

    if (configKey && configValue) {
      try {
        const vercelToken = process.env.VERCEL_API_TOKEN;
        const vercelProjectId = process.env.VERCEL_PROJECT_ID;
        const vercelTeamId = process.env.VERCEL_TEAM_ID;

        if (vercelToken && vercelProjectId) {
          console.log(`[Node E] Applying runtime patch to Vercel env: ${configKey}=${configValue}`);

          const queryParams = vercelTeamId ? `?teamId=${vercelTeamId}` : "";
          const response = await fetch(
            `https://api.vercel.com/v10/projects/${vercelProjectId}/env${queryParams}`,
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${vercelToken}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                key: configKey,
                value: configValue,
                type: "plain",
                target: ["production", "preview"],
              }),
            }
          );

          if (!response.ok) {
            const errorDetails = await response.text();
            throw new Error(`Vercel API returned status ${response.status}: ${errorDetails}`);
          }

          console.log(`[Node E] Successfully updated environment variable '${configKey}' on Vercel.`);
        } else {
          // Dev / Local fallback when live platform credentials are not populated
          console.warn(
            `[Node E] VERCEL_API_TOKEN or VERCEL_PROJECT_ID not set. Simulated configuration patch applied: ${configKey}=${configValue}`
          );
        }
      } catch (err) {
        console.error(`[Node E] Failed to apply runtime configuration patch:`, err);
      }
    } else {
      console.error(
        `[Node E] Missing configKey or configValue in actionPayload:`,
        state.actionPayload
      );
    }
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