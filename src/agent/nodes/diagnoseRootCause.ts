import { GoogleGenAI, Type } from "@google/genai";
import type {
  IncidentAgentState,
  IncidentAgentUpdate,
  ProposedAction,
  ActionPayload,
} from "../state";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function diagnoseRootCauseNode(
  state: IncidentAgentState
): Promise<IncidentAgentUpdate> {
  console.log(`[Node C: DiagnoseRootCause] Generating root cause analysis with Gemini 1.5 Flash...`);

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

  try {
    const response = await ai.models.generateContent({
      model: "gemini-1.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            hypothesis: {
              type: Type.STRING,
              description: "Clear, technical explanation of the failure mechanism.",
            },
            proposedAction: {
              type: Type.STRING,
              enum: [
                "REVERT_PR",
                "BUGFIX_PR",
                "APPLY_CONFIG_PATCH",
                "MANUAL_INTERVENTION",
                "NO_ACTION",
              ],
              description: "The category of recommended remediation action.",
            },
            actionPayload: {
              type: Type.OBJECT,
              description: "Key-value arguments needed to execute the proposed action.",
              properties: {
                targetCommitSha: {
                  type: Type.STRING,
                  description: "Required for REVERT_PR",
                },
                targetFilePath: {
                  type: Type.STRING,
                  description: "Required for BUGFIX_PR (e.g. src/app/dashboard.tsx)",
                },
                patchMode: {
                  type: Type.STRING,
                  enum: ["FULL_FILE", "SEARCH_REPLACE"],
                  description: "Required for BUGFIX_PR",
                },
                patchedFileContent: {
                  type: Type.STRING,
                  description: "Required when patchMode is FULL_FILE",
                },
                replacements: {
                  type: Type.ARRAY,
                  description: "Array of search-and-replace pairs for multi-block edits when patchMode is SEARCH_REPLACE",
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      searchBlock: {
                        type: Type.STRING,
                        description: "Exact snippet currently in the file to replace",
                      },
                      replaceBlock: {
                        type: Type.STRING,
                        description: "Corrected snippet that replaces searchBlock verbatim",
                      },
                    },
                    required: ["searchBlock", "replaceBlock"],
                  },
                },
                configKey: {
                  type: Type.STRING,
                  description: "Target key for APPLY_CONFIG_PATCH",
                },
                configValue: {
                  type: Type.STRING,
                  description: "New value for APPLY_CONFIG_PATCH",
                },
              },
            },
          },
          required: ["hypothesis", "proposedAction", "actionPayload"],
        },
      },
    });

    const resultText = response.text;
    if (!resultText) {
      throw new Error("Empty response received from Gemini.");
    }

    const parsed = JSON.parse(resultText) as {
      hypothesis: string;
      proposedAction: ProposedAction;
      actionPayload: ActionPayload;
    };

    console.log(`[Node C] Diagnosis completed. Proposed action: ${parsed.proposedAction}`);

    return {
      hypothesis: parsed.hypothesis,
      proposedAction: parsed.proposedAction,
      actionPayload: parsed.actionPayload || {},
    };
  } catch (error) {
    console.error(`[Node C] Failed to generate diagnosis:`, error);
    return {
      hypothesis: "Failed to automatically generate hypothesis due to model or parsing error.",
      proposedAction: "MANUAL_INTERVENTION",
      actionPayload: {},
    };
  }
}











// import type { IncidentAgentState, IncidentAgentUpdate } from "../state";
// import { GoogleGenAI, Type } from "@google/genai";
// import * as z from "zod";

// const ai = new GoogleGenAI({});

// const outputSchema = {
//   type: "object",
//   properties: {
//     "hypothesis": { type: "string" },
//     "proposedAction": { type: "string", enum: ["REVERT_PR", "APPLY_CONFIG_PATCH", "MANUAL_INTERVENTION", "NO_ACTION"] },
//     "actionPayload": { type: "object" }
//   },
//   required: ["hypothesis", "proposedAction", "actionPayload"]
// };

// const outputSchemaZ = z.fromJSONSchema(outputSchema);


// export async function diagnoseRootCauseNode(state: IncidentAgentState): Promise<IncidentAgentUpdate> {
//   console.log(`[Node C: DiagnoseRootCause] Generating root cause analysis...`);

//     const SYSTEM_PROMPT = `
//     You are an expert site reliability and software engineer investigating an active production incident.

//     Your task is to analyze the provided incident details, correlated logs, and recent code changes to formulate a concise, clear technical hypothesis explaining the root cause of this incident.

//     Additionally, you should suggest an automated remediation action based on your analysis:
//     - "REVERT_PR": If a specific recent commit diff directly caused this regression.
//     - "APPLY_CONFIG_PATCH": If the failure is caused by an environment variable, timeout, or config drift.
//     - "MANUAL_INTERVENTION": If the fix requires manual architectural changes or data migration.
//     - "NO_ACTION": If the error appears transient or harmless.

//     Here is are the details for the error that was reported for the service "${state.serviceName}":
//     stackTrace: "${state.stackTrace}",
//     errorMessage: "${state.errorMessage}"

//     correlated logs regarding this incident: 
//     "${state.correlatedLogs}"

//     candidate differences in the github repo that might have caused this error:
//     "${state.candidateCommits}"

//     - You have to return:
//         - diagnostic hypothesis explaining the bug that why did it happened in the first place from which code changes, and why did it caused this incident to happen.
//         -  A suggested mitigation category (REVERT_PR, APPLY_CONFIG_PATCH, or MANUAL_INTERVENTION).
//         - The payload required for the action (e.g., target commit SHA for revert).

//     You have to return the output in a JSON format with the following structure:
//     {
//       "hypothesis": "string",
//       "proposedAction": "REVERT_PR" | "APPLY_CONFIG_PATCH" | "MANUAL_INTERVENTION" | "NO_ACTION",
//       "actionPayload": Record<string, unknown>
//     }
//     `;

    
//     try {
//       const interaction = await ai.interactions.create({
//         model: "gemini-1.5-flash",
//         input: SYSTEM_PROMPT,
//         response_format: {
//           type: "text",
//           mime_type: "application/json",
//           schema: outputSchema
//         },
//       });
  
//       const op = outputSchemaZ.parse(JSON.parse(interaction.output_text || "{}"));
//       return {
//         hypothesis: op.hypothesis,
//         proposedAction: op.proposedAction as any,
//         actionPayload: op.actionPayload
//       }

//     }
//     catch (error) {
//       console.error(`[Node C] Failed to generate diagnosis:`, error);
//       return {
//         hypothesis: "Failed to automatically generate hypothesis due to model error.",
//         proposedAction: "MANUAL_INTERVENTION",
//         actionPayload: { error: String(error) },
//       };
//     }

// }

