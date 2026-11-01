import { GoogleGenAI, Type } from "@google/genai";
import { ActionPayloadSchema, ProposedActionSchema } from "../state";
import type { IncidentAgentState, IncidentAgentUpdate } from "../state";
import { generateGroqJson } from "../groq";
import { z } from "zod";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const diagnosisOutputSchema = z.object({
  incidentSeverity: z.enum(["SEV1", "SEV2", "SEV3"]),
  hypothesis: z.string().min(1),
  proposedAction: ProposedActionSchema,
  actionPayload: ActionPayloadSchema,
});

export async function diagnoseRootCauseNode(
  state: IncidentAgentState
): Promise<IncidentAgentUpdate> {
  console.log("[Node C: DiagnoseRootCause] Generating root cause analysis with Gemini; Groq is the fallback.");

  const formattedCommits =
    state.candidateCommits.length > 0
      ? state.candidateCommits
          .map(
            (c) =>
              `Commit SHA: ${c.sha}\nAuthor: ${c.author || "Unknown"}\nMessage: ${c.message}\nDiff:\n${c.diff}`
          )
          .join("\n---\n")
      : "No matching code changes found.";

  const formattedLogs =
    state.correlatedLogs.length > 0
      ? state.correlatedLogs.join("\n")
      : "No adjacent logs found.";

  const prompt = `
You are an expert site reliability and software engineer investigating an active production incident.

INCIDENT DETAILS:
- Service Name: ${state.serviceName}
- Error Message: ${state.errorMessage}
- Stack Trace:
${state.stackTrace}

CORRELATED LOGS (±10m window):
${formattedLogs}

RECENT CODE CHANGES (Git diffs merged in last 24h):
${formattedCommits}

TASK:
1. Formulate a concise, clear technical hypothesis explaining the root cause of this incident.
2. Select an automated remediation action and provide the required actionPayload arguments:

Return one JSON object with exactly these top-level fields:
{"incidentSeverity":"SEV1|SEV2|SEV3","hypothesis":"...","proposedAction":"REVERT_PR|BUGFIX_PR|APPLY_CONFIG_PATCH|MANUAL_INTERVENTION|NO_ACTION","actionPayload":{}}

ACTION SELECTION GUIDELINES:

1. REVERT_PR:
   - When to choose: A commit from candidateCommits merged within the blast radius introduced breaking regressions, syntax errors, or dependency breakage, and reverting that commit cleanly rolls back the damage.
   - Required actionPayload fields:
     * targetCommitSha: The full git commit SHA to revert.

2. BUGFIX_PR:
   - When to choose: The failure is an isolated, single-file bug (e.g., missing optional chaining '?.' or null check, unhandled promise rejection, type error, or off-by-one boundary) and the file is known from the stack trace or candidate commits.
   - You must select one of two patchModes:
     a) patchMode = "SEARCH_REPLACE" (Preferred for targeted fixes or files > 100 lines):
      * targetFilePath: Exact path of the file (e.g., "src/components/dashboard.tsx").
      * replacements: Array of objects [{ searchBlock, replaceBlock }].
        - searchBlock: Exact verbatim snippet currently in the file that must be replaced. Must include 2-3 lines of surrounding context to guarantee uniqueness. Never use placeholders or ellipses.
        - replaceBlock: The corrected code that replaces searchBlock verbatim.
        - List replacements in top-to-bottom file order.
     b) patchMode = "FULL_FILE" (Only for small scripts or components < 100 lines):
        * targetFilePath: Exact path of the file.
        * patchedFileContent: The complete, raw file contents with the fix applied. Do NOT wrap in markdown fences (\`\`\`).

3. APPLY_CONFIG_PATCH:
   - When to choose: The root cause is runtime misconfiguration (e.g., exhausted pool limit, timeout threshold too short, mismatched environment variable name).
   - Required actionPayload fields:
     * configKey: The configuration key or environment variable.
     * configValue: The proposed corrected value.

4. MANUAL_INTERVENTION:
   - When to choose: The root cause spans multiple files, requires schema migrations, involves third-party outages, or cannot be safely remedied without architectural decisions.
   - actionPayload should be empty {}.

5. NO_ACTION:
   - When to choose: Transient network blips, unrepeatable single-event drops, or already-recovered states.
   - actionPayload should be empty {}.
`;

  let parsed: z.infer<typeof diagnosisOutputSchema>;
  try {
    let responseText: string | null = null;
    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              hypothesis: { type: Type.STRING, description: "Clear, technical explanation of the failure mechanism." },
              proposedAction: {
                type: Type.STRING,
                enum: ["REVERT_PR", "BUGFIX_PR", "APPLY_CONFIG_PATCH", "MANUAL_INTERVENTION", "NO_ACTION"],
                description: "The category of recommended remediation action.",
              },
              incidentSeverity: {
                type: Type.STRING,
                enum: ["SEV1", "SEV2", "SEV3"],
                description: "SEV1 is most critical and SEV3 is least critical.",
              },
              actionPayload: {
                type: Type.OBJECT,
                description: "Key-value arguments needed to execute the proposed action.",
                properties: {
                  targetCommitSha: { type: Type.STRING, description: "Required for REVERT_PR" },
                  targetFilePath: { type: Type.STRING, description: "Required for BUGFIX_PR" },
                  patchMode: { type: Type.STRING, enum: ["FULL_FILE", "SEARCH_REPLACE"] },
                  patchedFileContent: { type: Type.STRING, description: "Required for FULL_FILE" },
                  replacements: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        searchBlock: { type: Type.STRING },
                        replaceBlock: { type: Type.STRING },
                      },
                      required: ["searchBlock", "replaceBlock"],
                    },
                  },
                  configKey: { type: Type.STRING, description: "Target key for APPLY_CONFIG_PATCH" },
                  configValue: { type: Type.STRING, description: "New value for APPLY_CONFIG_PATCH" },
                },
              },
            },
            required: ["hypothesis", "proposedAction", "incidentSeverity", "actionPayload"],
          },
        },
      });
      responseText = response.text ?? null;
      if (!responseText) throw new Error("Gemini returned an empty diagnosis.");
      parsed = diagnosisOutputSchema.parse(JSON.parse(responseText));
    } catch (geminiError) {
      console.error("[Node C] Gemini diagnosis failed; trying Groq fallback.", geminiError);
      responseText = await generateGroqJson(prompt);
      parsed = diagnosisOutputSchema.parse(JSON.parse(responseText));
      console.log("[Node C] Diagnosis generated with Groq fallback.");
    }

    console.log(`[Node C] Diagnosis completed. Proposed action: ${parsed.proposedAction}`);

    return {
      incidentSeverity: parsed.incidentSeverity,
      hypothesis: parsed.hypothesis,
      proposedAction: parsed.proposedAction,
      actionPayload: parsed.actionPayload || {},
    };
  } catch (error) {
    console.error("[Node C] Gemini and Groq diagnosis both failed.", error);
    return {
      incidentSeverity: "SEV3",
      hypothesis: "Failed to automatically generate hypothesis due to model or parsing error.",
      proposedAction: "MANUAL_INTERVENTION",
      actionPayload: {},
    };
  }
}