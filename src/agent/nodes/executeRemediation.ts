import type { IncidentAgentState, IncidentAgentUpdate } from "../state";
import { Octokit } from "@octokit/rest";
import { GoogleGenAI, Type } from "@google/genai";
import { prisma } from "../../lib/prisma";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function executeRemediationNode(
  state: IncidentAgentState
): Promise<IncidentAgentUpdate> {
  console.log(`[Node E: ExecuteRemediation] Processing action: ${state.proposedAction}`);

  let prUrl: string | null = null;

  // 1. Fetch Project & Deployment Metadata dynamically for multi-tenancy
  const incidentRecord = await prisma.incident.findUnique({
    where: { id: state.incidentId },
    include: { project: true },
  });

  const project = incidentRecord?.project;
  const owner = project?.repoOwner || process.env.GITHUB_OWNER || "";
  const repo = project?.repoName || process.env.GITHUB_REPO || "";
  const githubToken = project?.githubToken || process.env.GITHUB_TOKEN;
  const defaultBranch = project?.defaultBranch || "main";

  const octokit = new Octokit({ auth: githubToken });

  // 2. Automated GitHub Revert Flow
  if (state.humanApprovalStatus === "APPROVED" && state.proposedAction === "REVERT_PR") {
    const targetSha = state.actionPayload?.targetCommitSha as string;

    if (targetSha && owner && repo && githubToken) {
      try {
        const { data: refData } = await octokit.rest.git.getRef({
          owner,
          repo,
          ref: `heads/${defaultBranch}`,
        });
        const baseSha = refData.object.sha;

        const branchName = `healix/revert-${targetSha.slice(0, 7)}-${Date.now()}`;
        await octokit.rest.git.createRef({
          owner,
          repo,
          ref: `refs/heads/${branchName}`,
          sha: baseSha,
        });

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
    } else {
      console.warn("[Node E] Skipping REVERT_PR: Missing GitHub repository configuration or token.");
    }
  } 
  // 3. Automated Bugfix PR Flow
  else if (state.humanApprovalStatus === "APPROVED" && state.proposedAction === "BUGFIX_PR") {
    console.log(`[Node E] Processing automated bugfix PR...`);

    const targetFilePath = state.actionPayload?.targetFilePath as string;
    const patchMode = state.actionPayload?.patchMode;
    const targetSha = state.actionPayload?.targetCommitSha as string | undefined;

    if (targetFilePath && owner && repo && githubToken) {
      try {
        const { data: refData } = await octokit.rest.git.getRef({
          owner,
          repo,
          ref: `heads/${defaultBranch}`,
        });
        const baseSha = refData.object.sha;

        const branchIdentifier = targetSha ? targetSha.slice(0, 7) : Date.now().toString().slice(-6);
        const branchName = `healix/fix-${branchIdentifier}-${Date.now()}`;

        await octokit.rest.git.createRef({
          owner,
          repo,
          ref: `refs/heads/${branchName}`,
          sha: baseSha,
        });

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

        if (patchMode === "FULL_FILE") {
          patchedContent = state.actionPayload?.patchedFileContent as string;
        } else if (patchMode === "SEARCH_REPLACE") {
          const replacements = state.actionPayload?.replacements;

          if (!replacements || !Array.isArray(replacements) || replacements.length === 0) {
            throw new Error(`[Node E] patchMode is SEARCH_REPLACE, but 'replacements' array is missing or empty.`);
          }

          let updated = rawContent;
          for (let i = 0; i < replacements.length; i++) {
            const { searchBlock, replaceBlock } = replacements[i];
            if (!searchBlock || typeof replaceBlock !== "string") {
              throw new Error(`[Node E] Invalid replacement entry at index ${i}`);
            }
            if (!updated.includes(searchBlock)) {
              throw new Error(`[Node E] Replacement block #${i + 1} not found in ${targetFilePath}. Snippet: "${searchBlock.slice(0, 60)}..."`);
            }
            updated = updated.replace(searchBlock, replaceBlock);
          }
          patchedContent = updated;
        }

        if (!patchedContent) {
          throw new Error(`Unable to compute patched content for mode '${patchMode}'.`);
        }

        await octokit.rest.repos.createOrUpdateFileContents({
          owner,
          repo,
          path: targetFilePath,
          branch: branchName,
          message: `fix(healix): apply automated bugfix for ${targetFilePath}`,
          content: Buffer.from(patchedContent).toString("base64"),
          sha: currentSha,
        });

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
    } else {
      console.warn("[Node E] Skipping BUGFIX_PR: Missing targetFilePath or GitHub credentials.");
    }
  } 
  // 4. Automated Config Patch Flow
  else if (state.humanApprovalStatus === "APPROVED" && state.proposedAction === "APPLY_CONFIG_PATCH") {
    console.log(`[Node E] Processing approved configuration patch...`);

    const configKey = state.actionPayload?.configKey as string | undefined;
    const configValue = state.actionPayload?.configValue as string | undefined;
    const provider = project?.deploymentProvider || "NONE";

    if (!configKey || configValue === undefined) {
      const errorMsg = "Configuration patch aborted: Missing 'configKey' or 'configValue' in action payload.";
      console.error(`[Node E] ${errorMsg}`);
      state.actionPayload = {
        ...state.actionPayload,
        patchStatus: "FAILED",
        patchFailureReason: errorMsg,
      };
    } else {
      try {
        switch (provider) {
          case "RENDER": {
            const apiKey = project?.platformApiToken || process.env.RENDER_API_KEY;
            const serviceId = project?.platformServiceId || process.env.RENDER_SERVICE_ID;

            if (!apiKey || !serviceId) {
              throw new Error("Render credentials missing: platformApiToken or platformServiceId not configured.");
            }

            console.log(`[Node E] Dispatching env update to Render Service: ${serviceId}`);
            const response = await fetch(`https://api.render.com/v1/services/${serviceId}/env-vars`, {
              method: "PUT",
              headers: {
                Authorization: `Bearer ${apiKey}`,
                "Content-Type": "application/json",
                Accept: "application/json",
              },
              body: JSON.stringify([{ key: configKey, value: configValue }]),
            });

            if (!response.ok) {
              const errBody = await response.text();
              throw new Error(`Render API responded with HTTP ${response.status}: ${errBody}`);
            }

            console.log(`[Node E] Successfully updated ${configKey} on Render.`);
            state.actionPayload = {
              ...state.actionPayload,
              patchStatus: "APPLIED",
              targetProvider: "RENDER",
              appliedKey: configKey,
              appliedValue: configValue,
            };
            break;
          }

          case "VERCEL": {
            const token = project?.platformApiToken || process.env.VERCEL_API_TOKEN;
            const projectId = project?.platformServiceId || process.env.VERCEL_PROJECT_ID;
            const teamId = project?.platformTeamId || process.env.VERCEL_TEAM_ID;

            if (!token || !projectId) {
              throw new Error("Vercel credentials missing: platformApiToken or platformServiceId not configured.");
            }

            console.log(`[Node E] Dispatching env update to Vercel Project: ${projectId}`);
            const query = teamId ? `?teamId=${teamId}` : "";
            const response = await fetch(`https://api.vercel.com/v10/projects/${projectId}/env${query}`, {
              method: "POST",
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                key: configKey,
                value: configValue,
                type: "plain",
                target: ["production", "preview"],
              }),
            });

            if (!response.ok) {
              const errBody = await response.text();
              throw new Error(`Vercel API responded with HTTP ${response.status}: ${errBody}`);
            }

            console.log(`[Node E] Successfully updated ${configKey} on Vercel.`);
            state.actionPayload = {
              ...state.actionPayload,
              patchStatus: "APPLIED",
              targetProvider: "VERCEL",
              appliedKey: configKey,
              appliedValue: configValue,
            };
            break;
          }

          case "CUSTOM": {
            const webhookUrl = project?.customWebhookUrl;

            if (!webhookUrl) {
              throw new Error("Custom remediation webhook URL is not defined on the project.");
            }

            console.log(`[Node E] Forwarding config patch payload to custom webhook: ${webhookUrl}`);
            const response = await fetch(webhookUrl, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "X-Healix-Signature": project.apiKey,
              },
              body: JSON.stringify({
                event: "HEALIX_CONFIG_PATCH",
                incidentId: state.incidentId,
                configKey,
                configValue,
                timestamp: new Date().toISOString(),
              }),
            });

            if (!response.ok) {
              const errBody = await response.text();
              throw new Error(`Custom webhook endpoint returned HTTP ${response.status}: ${errBody}`);
            }

            console.log(`[Node E] Custom webhook successfully acknowledged configuration patch.`);
            state.actionPayload = {
              ...state.actionPayload,
              patchStatus: "FORWARDED_CUSTOM_WEBHOOK",
              targetProvider: "CUSTOM",
              webhookUrl,
            };
            break;
          }

          case "NONE":
          default: {
            const skipReason =
              "Automated runtime configuration patch was diagnosed by Healix, but skipped because no deployment provider (Render/Vercel/Custom) or API credentials were linked to this project.";
            console.warn(`[Node E] ${skipReason}`);
            state.actionPayload = {
              ...state.actionPayload,
              patchStatus: "SKIPPED_NO_PROVIDER",
              recommendedKey: configKey,
              recommendedValue: configValue,
              operatorActionRequired: `Manually set environment variable: ${configKey}=${configValue} in your hosting platform dashboard.`,
            };
            break;
          }
        }
      } catch (err: any) {
        console.error(`[Node E] Failed to execute configuration patch:`, err);
        state.actionPayload = {
          ...state.actionPayload,
          patchStatus: "FAILED",
          patchFailureReason: err?.message || String(err),
        };
      }
    }
  }

  // 5. Format Context for Gemini Post-Mortem Synthesis
  const formattedCommits = state.candidateCommits.length > 0
    ? state.candidateCommits.map((c) => `SHA: ${c.sha}\nAuthor: ${c.author}\nDiff:\n${c.diff}`).join("\n---\n")
    : "No recent candidate commits.";

  const formattedLogs = state.correlatedLogs.length > 0
    ? state.correlatedLogs.join("\n")
    : "No correlated logs.";

  let mitigationOutcomeSummary = "Manual intervention required or no action taken.";

  if (state.proposedAction === "BUGFIX_PR" || state.proposedAction === "REVERT_PR") {
    mitigationOutcomeSummary = prUrl
      ? `Remediation Pull Request successfully created at: ${prUrl}`
      : "Failed to generate remediation Pull Request on GitHub.";
  } else if (state.proposedAction === "APPLY_CONFIG_PATCH") {
    const status = state.actionPayload?.patchStatus;
    if (status === "APPLIED") {
      mitigationOutcomeSummary = `Automated configuration patch applied to ${state.actionPayload?.targetProvider}: set ${state.actionPayload?.appliedKey}=${state.actionPayload?.appliedValue}.`;
    } else if (status === "FORWARDED_CUSTOM_WEBHOOK") {
      mitigationOutcomeSummary = `Configuration patch forwarded to custom webhook: ${state.actionPayload?.webhookUrl}.`;
    } else if (status === "SKIPPED_NO_PROVIDER") {
      mitigationOutcomeSummary = `Automated patch skipped: No cloud credentials or webhook configured for deploymentProvider (${state.actionPayload?.targetProvider || "NONE"}). Required manual update: ${state.actionPayload?.recommendedKey}=${state.actionPayload?.recommendedValue}.`;
    } else {
      mitigationOutcomeSummary = `Configuration patch attempt failed: ${state.actionPayload?.patchFailureReason || "Unknown error"}.`;
    }
  }

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

MITIGATION OUTCOME:
${mitigationOutcomeSummary}

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

  // 6. Generate Post-Mortem via Gemini with Safe Fallback
  let parsed = {
    title: "Incident Post-Mortem Report",
    summary: state.hypothesis.slice(0, 500),
    rootCause: state.hypothesis,
    mitigationSteps: mitigationOutcomeSummary,
    markdownContent: `# Incident Post-Mortem: ${state.incidentId}\n\n**Root Cause:**\n${state.hypothesis}\n\n**Mitigation:**\n${mitigationOutcomeSummary}`,
  };

  try {
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

    if (response.text) {
      parsed = { ...parsed, ...JSON.parse(response.text) };
    }
  } catch (llmErr) {
    console.error("[Node E] Failed to generate/parse post-mortem from Gemini:", llmErr);
  }

  // 7. Finalize state in Neon Database
  const finalStatus = state.humanApprovalStatus === "APPROVED" ? "RESOLVED" : "DISMISSED";

  await prisma.incident.update({
    where: { id: state.incidentId },
    data: {
      status: finalStatus,
      remediationPrUrl: prUrl,
      revertPrUrl: prUrl,
      actionPayload: state.actionPayload as any,
    },
  });

  await prisma.postMortem.upsert({
    where: { incidentId: state.incidentId },
    update: {
      title: parsed.title,
      fullMarkdown: parsed.markdownContent,
      summary: parsed.summary,
      rootCause: parsed.rootCause,
      mitigationSteps: parsed.mitigationSteps,
    },
    create: {
      incidentId: state.incidentId,
      title: parsed.title,
      fullMarkdown: parsed.markdownContent,
      summary: parsed.summary,
      rootCause: parsed.rootCause,
      mitigationSteps: parsed.mitigationSteps,
    },
  });

  return {
    revertPrUrl: prUrl || undefined,
    postMortemMarkdown: parsed.markdownContent,
  };
}