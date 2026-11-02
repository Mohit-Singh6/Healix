```markdown
# TASK: Integrate Deterministic Heuristic Ranking & Expand Candidate File Threshold to 7 (Part 1.1)

## Strict Guardrails & Non-Negotiables
- DO NOT rewrite, rename, or touch any logic inside `correlateLogs.ts`, `diagnoseRootCause.ts`, `executeRemediation.ts`, `generatePostMortem.ts`, or `resumeTriage.ts`.
- DO NOT alter the database schema (`schema.prisma`) or Prisma model access patterns.
- DO NOT change existing LangGraph state interface definitions in `src/agent/state.ts` (the types `CandidateCommitMeta` and `InspectedFile` remain unchanged).
- Keep all modifications strictly scoped to:
  1. Adding a deterministic heuristic file-ranking helper in `src/agent/nodes/inspectCodebase.ts` (or an adjacent utility).
  2. Integrating the ranker right before the Groq triage classification step.
  3. Updating the file threshold from 5 to 7 in both `src/agent/groq.ts` and `src/agent/nodes/inspectCodebase.ts`.

---

## 1. Implement Deterministic Heuristic File Scorer

Create and export a scoring helper function (either directly in `src/agent/nodes/inspectCodebase.ts` or in a helper file imported by it) named `scoreAndRankCandidateFiles`:

`typescript
export function scoreAndRankCandidateFiles(params: {
  candidateFiles: string[];
  endpoint?: string;
  errorMessage: string;
  stackTrace: string;
}): string[];
`

### Scoring Logic Requirements:

1. **Endpoint/Route Alignment (+50 points):**
* Normalize `endpoint` by stripping leading/trailing slashes and tokenizing along `/`, `-`, or `_` (ignore tokens $\le 2$ characters).
* If any route segment (e.g., `login`, `auth`, `requests`) matches a directory or file substring (case-insensitive) in `candidateFile`, add `+50`.


2. **Explicit Stack Trace Mention (+40 points):**
* Extract the trailing filename (e.g., `Login.jsx` from `frontend/src/pages/Login.jsx`).
* If the lowercase stack trace includes the exact filename or relative path, add `+40`.


3. **UI vs. Error-Type Correlation (+20 points):**
* Check if the file is a frontend UI component (ends with `.jsx`, `.tsx`, `.vue`, `.svelte`, or path includes `/pages/` or `/components/`).
* If the error message indicates property dereferencing (e.g., contains `cannot read properties`, `reading '`, or `is null`/`is undefined`), add `+20`.


4. **Penalize Infrastructure, Telemetry, and Loggers (-30 points):**
* If the lowercase file path contains words like `logger`, `telemetry`, `errorboundary`, `setup`, `report`, or `tracker`, subtract `-30`.


5. **Penalize Backend Logic on Frontend Routes (-25 points):**
* If `endpoint` is present, does not begin with `/api/`, and the file path starts with `backend/` or is named `server.js` / `app.js`, subtract `-25`.


6. **Return Order:**
* Sort the files in descending order based on score and return the ranked `string[]` array.



---

## 2. Update Fast Triage Classifier (`src/agent/groq.ts`)

Update `fastClassifySuspectFiles` to handle a budget of **7 candidate files**:

1. **Bypass Check:** Change `if (candidateFiles.length <= 5)` to `if (candidateFiles.length <= 7) return candidateFiles;`.
2. **Prompt Update:** Update the prompt instructions to tell `llama-3.1-8b-instant` to select up to the **7 most likely culprit files** from the candidate list.
3. **Array Fallback Slicing:**
* Update any `slice(0, 5)` fallbacks (e.g., JSON parse failures or API errors) to `slice(0, 7)`.
* Ensure returned files are strictly filtered against `candidateFiles` and capped at 7 items.



---

## 3. Update Pipeline in Node B (`src/agent/nodes/inspectCodebase.ts`)

Connect the heuristic ranking and the new 7-file boundary in `inspectCodebaseNode`:

1. **Apply Heuristic Ranking:**
* Immediately after Layer 1 (extension and directory hygiene exclusion), take the sanitized candidate file paths and pass them into `scoreAndRankCandidateFiles`:
`typescript
const rankedFiles = scoreAndRankCandidateFiles({
  candidateFiles: sanitizedFiles,
  endpoint: state.endpoint,
  errorMessage: state.errorMessage,
  stackTrace: state.stackTrace,
});

`




2. **Pass Ranked Candidates to Groq:**
* Send `rankedFiles` to `fastClassifySuspectFiles(...)`.


3. **Update Hydration Loop Capacity:**
* Iterate over the returned file paths and hydrate up to **7 files** (instead of 5) via `octokit.rest.repos.getContent`.
* Maintain the line-budgeting guardrail: if any hydrated file exceeds 400 lines, truncate or retain hunks with context; if under 400 lines, retain full UTF-8 content.



---

```