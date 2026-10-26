import { GoogleGenAI, Type } from "@google/genai";
import type { IncidentAgentState, IncidentAgentUpdate, ProposedAction } from "../state";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function diagnoseRootCauseNode(
  state: IncidentAgentState
): Promise<IncidentAgentUpdate> {
  console.log(`[Node C: DiagnoseRootCause] Generating root cause analysis with Gemini 1.5 Flash...`);

  const prompt = `
You are an expert site reliability and software engineer investigating an active production incident.

INCIDENT DETAILS:
- Service Name: ${state.serviceName}
- Error Message: ${state.errorMessage}
- Stack Trace:
${state.stackTrace}

CORRELATED LOGS (±10m window):
${state.correlatedLogs.length > 0 ? state.correlatedLogs.join("\n") : "No adjacent logs found."}

RECENT CODE CHANGES (Git diffs merged in last 24h):
${
  state.candidateCommits.length > 0
    ? state.candidateCommits
        .map(
          (c) =>
            `Commit SHA: ${c.sha}\nAuthor: ${c.author}\nMessage: ${c.message}\nDiff:\n${c.diff}`
        )
        .join("\n---\n")
    : "No matching code changes found."
}

TASK:
1. Formulate a concise, clear technical hypothesis explaining the root cause of this incident.
2. Suggest an automated remediation action:
   - "REVERT_PR": If a specific recent commit diff directly caused this regression.
   - "APPLY_CONFIG_PATCH": If the failure is caused by an environment variable, timeout, or config drift.
   - "MANUAL_INTERVENTION": If the fix requires manual architectural changes or data migration.
   - "NO_ACTION": If the error appears transient or harmless.
3. If proposing "REVERT_PR", set actionPayload to include "targetCommitSha" and "reason".
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
              enum: ["REVERT_PR", "APPLY_CONFIG_PATCH", "MANUAL_INTERVENTION", "NO_ACTION"],
              description: "The category of recommended remediation action.",
            },
            actionPayload: {
              type: Type.OBJECT,
              description: "Key-value arguments needed to execute the proposed action.",
              properties: {
                targetCommitSha: { type: Type.STRING },
                reason: { type: Type.STRING },
              },
            },
          },
          required: ["hypothesis", "proposedAction", "actionPayload"],
        },
      },
    });

    const resultText = response.text;
    if (!resultText) {
      throw new Error("Empty response from Gemini.");
    }

    const parsed = JSON.parse(resultText) as {
      hypothesis: string;
      proposedAction: ProposedAction;
      actionPayload: Record<string, unknown>;
    };

    console.log(`[Node C] Diagnostic completed. Action proposed: ${parsed.proposedAction}`);
    return {
      hypothesis: parsed.hypothesis,
      proposedAction: parsed.proposedAction,
      actionPayload: parsed.actionPayload,
    };
  } catch (error) {
    console.error(`[Node C] Failed to generate diagnosis:`, error);
    return {
      hypothesis: "Failed to automatically generate hypothesis due to model error.",
      proposedAction: "MANUAL_INTERVENTION",
      actionPayload: { error: String(error) },
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

