"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowUpRight,
  Check,
  CircleAlert,
  Clipboard,
  Clock3,
  GitCommitHorizontal,
  Pause,
  X,
} from "lucide-react";
import StatusBadge from "@/src/components/ui/StatusBadge";
import type { IncidentData } from "@/src/components/incidents/incident-data";

const tabs = [
  { id: "diff", label: "Suspect Diff" },
  { id: "logs", label: "Correlated Logs (±10m)" },
  { id: "trace", label: "Raw Stack Trace" },
] as const;

type TabId = (typeof tabs)[number]["id"];

function timeLabel(value: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? null
    : date.toLocaleTimeString("en-GB", { hour12: false, timeZone: "UTC" });
}

function actionLabel(incident: IncidentData): string {
  return incident.proposedAction === "APPLY_CONFIG_PATCH"
    ? "Approve & Apply Patch"
    : "Approve & Open PR";
}

export default function IncidentWorkbench({
  incidentId,
  incident,
}: {
  incidentId: string;
  incident: IncidentData;
}) {
  const [activeTab, setActiveTab] = useState<TabId>("diff");
  const [copyMessage, setCopyMessage] = useState("");
  const [incidentData, setIncidentData] = useState(incident);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [decisionError, setDecisionError] = useState("");
  const [rejectionFeedback, setRejectionFeedback] = useState("");

  const isPending = incidentData.status === "PENDING_APPROVAL" &&
    incidentData.humanApprovalStatus === "PENDING";
  const isResolved = incidentData.status === "RESOLVED";
  const isDismissed = incidentData.status === "DISMISSED";
  const isMitigating = incidentData.status === "MITIGATING";
  const severityTone = incidentData.severity === "CRITICAL"
    ? "critical"
    : incidentData.severity === "HIGH"
      ? "high"
      : "muted";

  async function copyThreadId() {
    if (!navigator.clipboard) {
      setCopyMessage("Clipboard access is unavailable in this browser.");
      return;
    }

    try {
      await navigator.clipboard.writeText(incidentData.id);
      setCopyMessage("Incident ID copied.");
    } catch (error) {
      console.error("Unable to copy the incident ID.", error);
      setCopyMessage("Could not copy the incident ID. Check clipboard permissions and try again.");
    }
  }

  async function submitDecision(status: "APPROVED" | "REJECTED") {
    setIsSubmitting(true);
    setDecisionError("");

    try {
      const response = await fetch(`/api/incidents/${encodeURIComponent(incidentId)}/decision`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          feedback: status === "REJECTED" ? rejectionFeedback : undefined,
        }),
      });
      const result = await response.json() as { incident?: IncidentData | null; error?: string };

      if (result.incident) setIncidentData(result.incident);
      if (!response.ok) {
        setDecisionError(result.error ?? "Unable to process this incident decision.");
        return;
      }

      setRejectionFeedback("");
    } catch (error) {
      console.error("Unable to submit the incident decision.", error);
      setDecisionError("The decision could not be sent. Check your connection and try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const lifecycleSteps = [
    { time: timeLabel(incidentData.timestamp), label: "Ingested", complete: true },
    {
      time: null,
      label: incidentData.proposedAction ? "Diagnosed" : "Investigating",
      complete: Boolean(incidentData.proposedAction),
    },
    {
      time: timeLabel(incidentData.decidedAt),
      label: incidentData.humanApprovalStatus === "APPROVED"
        ? "Operator Approved"
        : incidentData.humanApprovalStatus === "REJECTED" && isDismissed
          ? "Operator Rejected"
          : "Approval Gate",
      complete: incidentData.humanApprovalStatus !== "PENDING",
    },
    {
      time: incidentData.remediationPrUrl ? timeLabel(incidentData.updatedAt) : null,
      label: incidentData.remediationPrUrl ? "PR Created" : isResolved ? "Remediated" : "Awaiting Action",
      complete: isResolved,
    },
  ];

  return (
    <main className="mx-auto w-full max-w-[1600px] flex-1 bg-[#121211] px-5 pb-20 pt-8 text-[#EDEDE8] sm:px-8 lg:px-12">
      <Link href="/dashboard" className="inline-flex items-center gap-2 font-mono text-xs text-[#8A8A82] transition-colors hover:text-[#EDEDE8]">
        <ArrowLeft aria-hidden="true" size={14} />
        War Room
      </Link>

      <div className="mt-6 overflow-x-auto rounded-lg border border-[#262520] bg-[#181816]">
        <ol aria-label="Incident lifecycle" className="grid min-w-[680px] grid-cols-4 px-4 py-4 sm:px-5">
          {lifecycleSteps.map((step, index) => (
            <li key={step.label} className="min-w-0">
              <div className="flex items-center pr-4">
                <span className={`size-2.5 shrink-0 rounded-full border ${step.complete ? "border-emerald-500 bg-emerald-500" : index === 2 && isPending ? "border-[#F59E0B] bg-[#F59E0B]/30" : "border-[#5B5A52] bg-transparent"}`} />
                {index < lifecycleSteps.length - 1 && (
                  <span aria-hidden="true" className={`h-px flex-1 ${step.complete ? "bg-emerald-800" : "bg-[#383730]"}`} />
                )}
              </div>
              <div className="mt-2 min-h-10 pr-4">
                <span className="block h-4">
                  {step.time && (
                    <time
                      dateTime={index === 0 ? incidentData.timestamp : index === 2 ? incidentData.decidedAt ?? undefined : incidentData.updatedAt}
                      className={`font-mono text-xs ${step.complete ? "text-[#D4D4CE]" : "text-[#8E8E86]"}`}
                    >
                      {step.time}
                    </time>
                  )}
                </span>
                <span className={`block text-sm leading-relaxed ${step.complete ? "text-[#D4D4CE]" : index === 2 && isPending ? "text-[#F59E0B]" : "text-[#8E8E86]"}`}>{step.label}</span>
              </div>
            </li>
          ))}
        </ol>
      </div>

      <header className="mt-6 flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <p className="font-mono text-xs tracking-wider text-[#8A8A82]">INCIDENT FORENSICS</p>
            <StatusBadge tone={severityTone}><CircleAlert aria-hidden="true" size={13} /> {incidentData.severity}</StatusBadge>
            <StatusBadge tone="muted"><Clock3 aria-hidden="true" size={12} /> <time dateTime={incidentData.timestamp}>{incidentData.timestamp.replace("T", " ").replace("Z", " UTC")}</time></StatusBadge>
            <StatusBadge tone="muted">{incidentData.service}</StatusBadge>
            <StatusBadge tone={isResolved ? "healthy" : isPending ? "high" : "muted"}>
              {incidentData.status.replaceAll("_", " ")}
            </StatusBadge>
          </div>
          <h1 className="mt-3 font-mono text-3xl font-semibold tracking-tight text-[#EDEDE8] sm:text-4xl">{incidentData.displayId}</h1>
          <p className="mt-2 text-sm font-medium text-[#D4D4CE]">{incidentData.title}</p>
        </div>
        <div className="flex flex-col items-start gap-1 lg:items-end">
          <button
            type="button"
            onClick={copyThreadId}
            className="inline-flex min-h-9 items-center gap-2 rounded border border-[#383730] bg-[#1B1B18] px-3 font-mono text-xs text-[#A1A19A] transition-colors hover:text-[#EDEDE8]"
          >
            {copyMessage === "Incident ID copied." ? <Check aria-hidden="true" size={14} /> : <Clipboard aria-hidden="true" size={14} />}
            Copy Incident ID
          </button>
          <p aria-live="polite" className="min-h-4 text-xs text-[#8A8A82]">{copyMessage}</p>
        </div>
      </header>

      <section
        aria-labelledby="approval-heading"
        className={`mt-7 flex flex-col justify-between gap-5 rounded-lg border p-5 transition-colors ${
          isResolved ? "border-emerald-800/40 bg-emerald-950/20" : isDismissed ? "border-[#383730] bg-[#181816]" : "border-[#D97706]/40 bg-[#1E1C14]"
        } lg:flex-row lg:items-center`}
      >
        <div className="flex items-start gap-4">
          <span className={`flex size-10 shrink-0 items-center justify-center rounded-md border ${
            isResolved ? "border-emerald-800/40 bg-emerald-950/40 text-emerald-400" : isDismissed ? "border-[#383730] bg-[#121211] text-[#A1A19A]" : "border-[#D97706]/30 bg-[#F59E0B]/10 text-[#F59E0B]"
          }`}>
            {isResolved ? <Check aria-hidden="true" size={18} /> : isDismissed ? <X aria-hidden="true" size={18} /> : <Pause aria-hidden="true" size={18} />}
          </span>
          <div>
            <p className={`font-mono text-xs tracking-wide ${isResolved ? "text-emerald-400" : isDismissed ? "text-[#A1A19A]" : "text-[#F59E0B]"}`}>
              {isResolved ? "REMEDIATION COMPLETED" : isDismissed ? "INCIDENT DISMISSED" : isMitigating ? "REMEDIATION IN PROGRESS" : "EXECUTION PAUSED AT NODE D · HUMAN APPROVAL"}
            </p>
            <h2 id="approval-heading" className="mt-2 text-lg font-semibold text-[#EDEDE8]">
              {isPending ? "Review the proposed action" : isResolved ? "Approved remediation completed" : isDismissed ? "The proposed action was rejected" : isMitigating ? "The decision was recorded; remediation needs attention" : "Triage is still investigating"}
            </h2>
            <p className="mt-1 text-sm leading-6 text-[#A1A19A]">
              {incidentData.actionSummary ?? "Automated triage has not proposed a remediation yet."}
            </p>
            {incidentData.remediationPrUrl && (
              <a
                href={incidentData.remediationPrUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex items-center gap-1 font-mono text-xs text-emerald-400 underline underline-offset-4 hover:text-emerald-300"
              >
                View remediation pull request <ArrowUpRight aria-hidden="true" size={13} />
              </a>
            )}
            {incidentData.operatorFeedback && !isPending && (
              <p className="mt-2 max-w-3xl text-sm leading-relaxed text-[#D4D4CE]">
                <span className="font-mono text-xs uppercase text-[#8E8E86]">Operator / execution note: </span>
                {incidentData.operatorFeedback}
              </p>
            )}
            {incidentData.reviewedBy && incidentData.decidedAt && (
              <p className="mt-2 font-mono text-xs text-[#8E8E86]">
                Reviewed by {incidentData.reviewedBy} · {incidentData.decidedAt.replace("T", " ").replace("Z", " UTC")}
              </p>
            )}
          </div>
        </div>
        {isPending && (
          <div className="flex w-full shrink-0 flex-col gap-2 lg:w-auto lg:max-w-sm lg:items-end">
            {incidentData.proposedAction && (
              <>
                <textarea
                  value={rejectionFeedback}
                  onChange={(event) => setRejectionFeedback(event.target.value)}
                  rows={2}
                  maxLength={2000}
                  aria-label="Optional rejection feedback"
                  placeholder="Optional feedback if you reject this action"
                  className="w-full resize-y rounded border border-[#383730] bg-[#121211] px-3 py-2 text-sm text-[#EDEDE8] outline-none placeholder:text-[#77766F] focus:border-[#F59E0B] lg:min-w-72"
                />
                <div className="flex flex-wrap gap-2 lg:justify-end">
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => void submitDecision("REJECTED")}
                    className="inline-flex min-h-9 items-center justify-center rounded border border-[#383730] bg-transparent px-4 font-mono text-xs text-[#D4D4CE] transition-colors hover:border-rose-900/40 hover:text-rose-300 disabled:cursor-wait disabled:opacity-60"
                  >
                    {isSubmitting ? "Saving..." : "Reject"}
                  </button>
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => void submitDecision("APPROVED")}
                    className="inline-flex min-h-9 items-center justify-center rounded bg-[#F59E0B] px-4 font-mono text-xs font-semibold text-black transition-colors hover:bg-[#D97706] disabled:cursor-wait disabled:opacity-70"
                  >
                    {isSubmitting ? "Resuming triage..." : actionLabel(incidentData)}
                  </button>
                </div>
              </>
            )}
            {decisionError && <p role="alert" className="text-sm leading-relaxed text-rose-300">{decisionError}</p>}
          </div>
        )}
        {decisionError && !isPending && <p role="alert" className="text-sm leading-relaxed text-rose-300">{decisionError}</p>}
      </section>

      <section aria-label="Forensic evidence" className="mt-7 grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
        <article className="rounded-lg border border-[#262520] bg-[#181816] p-5">
          <div className="flex items-center gap-3">
            <span className="flex size-9 items-center justify-center rounded-md border border-[#383730] bg-[#121211] text-[#F59E0B]">
              <GitCommitHorizontal aria-hidden="true" size={17} />
            </span>
            <div>
              <p className="font-mono text-xs tracking-wider text-[#8E8E86]">ROOT-CAUSE ANALYSIS</p>
              <h2 className="mt-1 text-base font-semibold text-[#EDEDE8]">Diagnosis &amp; cause</h2>
            </div>
          </div>
          <p className="mt-5 whitespace-pre-wrap text-sm leading-relaxed text-[#D4D4CE]">{incidentData.hypothesis}</p>
          <div className="mt-5 border-t border-[#262520] pt-4">
            <p className="font-mono text-xs uppercase tracking-wider text-[#8E8E86]">Suspect commit</p>
            {incidentData.suspectCommit.hash || incidentData.suspectCommit.file ? (
              <>
                <p className="mt-2 inline-flex flex-wrap items-center gap-1.5 rounded border border-[#383730] bg-[#121211] px-2.5 py-1.5 font-mono text-sm text-[#D4D4CE]">
                  <GitCommitHorizontal aria-hidden="true" size={14} className="text-[#F59E0B]" />
                  {incidentData.suspectCommit.hash ? `commit ${incidentData.suspectCommit.hash}` : "Suspect source"}
                  {incidentData.suspectCommit.author && ` by ${incidentData.suspectCommit.author}`}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-[#A1A19A]">
                  {incidentData.suspectCommit.file ?? "Source file unavailable"}
                  {incidentData.suspectCommit.functionName ? ` · ${incidentData.suspectCommit.functionName}` : ""}
                  {incidentData.suspectCommit.time ? ` · ${incidentData.suspectCommit.time}` : ""}
                </p>
                {incidentData.suspectCommit.message && <p className="mt-2 text-sm text-[#8E8E86]">{incidentData.suspectCommit.message}</p>}
              </>
            ) : (
              <p className="mt-2 text-sm text-[#8E8E86]">No suspect commit has been identified.</p>
            )}
          </div>
          {incidentData.confidence !== null && (
            <div className="mt-5 flex items-center justify-between border-t border-[#262520] pt-4">
              <span className="font-mono text-xs uppercase tracking-wider text-[#8E8E86]">Model confidence</span>
              <span className="font-mono text-sm text-[#F59E0B]">{incidentData.confidence}%</span>
            </div>
          )}
        </article>

        <article className="min-w-0 overflow-hidden rounded-lg border border-[#262520] bg-[#141412]">
          <div role="tablist" aria-label="Incident evidence views" className="flex overflow-x-auto border-b border-[#262520]">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                id={`tab-${tab.id}`}
                aria-selected={activeTab === tab.id}
                aria-controls={`panel-${tab.id}`}
                onClick={() => setActiveTab(tab.id)}
                className={`min-h-12 shrink-0 border-b-2 px-4 font-mono text-sm transition-colors ${
                  activeTab === tab.id
                    ? "border-[#F59E0B] bg-[#F59E0B]/5 text-[#F59E0B]"
                    : "border-transparent text-[#8A8A82] hover:text-[#EDEDE8]"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {activeTab === "diff" && (
            <div className="border-b border-[#262520] bg-[#181816] px-4 py-3 sm:px-5">
              <p className="font-mono text-xs leading-relaxed text-[#A1A19A]">
                <span className="text-[#8E8E86]">Blame:</span>{" "}
                {incidentData.suspectCommit.hash
                  ? `commit ${incidentData.suspectCommit.hash}${incidentData.suspectCommit.author ? ` by ${incidentData.suspectCommit.author}` : ""}${incidentData.suspectCommit.message ? ` ("${incidentData.suspectCommit.message}")` : ""}`
                  : "No suspect commit identified"}
              </p>
              <p className="mt-1 font-mono text-xs leading-relaxed text-[#8E8E86]">
                Proposed action: {incidentData.proposedAction ?? "Not yet determined"}
              </p>
            </div>
          )}

          <div
            role="tabpanel"
            id={`panel-${activeTab}`}
            aria-labelledby={`tab-${activeTab}`}
            tabIndex={0}
            className="min-h-[380px] p-4 sm:p-5"
          >
            {activeTab === "diff" && (
              <div className="min-h-[340px] overflow-x-auto font-mono text-xs leading-relaxed">
                <p className="mb-4 text-[#8E8E86]">
                  {incidentData.suspectCommit.file
                    ? `@@ proposed change · ${incidentData.suspectCommit.file} @@`
                    : "@@ proposed remediation @@"}
                </p>
                {incidentData.diff.removed.map((line, index) => (
                  <p key={`removed-${index}`} className="whitespace-pre-wrap break-words border-l-2 border-rose-500 bg-rose-950/40 px-3 py-1 text-rose-300">
                    <span className="line-through">- {line}</span>
                  </p>
                ))}
                {incidentData.diff.added.map((line, index) => (
                  <p key={`added-${index}`} className="whitespace-pre-wrap break-words border-l-2 border-emerald-500 bg-emerald-950/40 px-3 py-1 text-emerald-300">
                    + {line}
                  </p>
                ))}
                {incidentData.diff.removed.length === 0 && incidentData.diff.added.length === 0 && (
                  <p className="text-sm leading-relaxed text-[#8E8E86]">
                    No source diff is stored for this incident. {incidentData.actionSummary ?? "Additional evidence may be available after triage completes."}
                  </p>
                )}
              </div>
            )}

            {activeTab === "logs" && (
              <div className="max-h-80 overflow-auto font-mono text-xs leading-relaxed">
                {incidentData.logs.length > 0
                  ? incidentData.logs.map((log, index) => {
                    const levelClass = log.includes("ERROR")
                      ? "text-rose-300"
                      : log.includes("WARN")
                        ? "text-[#F59E0B]"
                        : "text-emerald-400";
                    return <p key={`${index}-${log}`} className={`border-b border-[#262520] py-2 ${levelClass}`}>{log}</p>;
                  })
                  : <p className="text-sm text-[#8E8E86]">No correlated log entries are available.</p>}
              </div>
            )}

            {activeTab === "trace" && (
              <details className="group">
                <summary className="cursor-pointer font-mono text-xs text-[#A1A19A] transition-colors hover:text-[#EDEDE8]">
                  Expand full stack trace
                </summary>
                <pre className="mt-4 max-h-80 overflow-auto whitespace-pre-wrap break-words border-t border-[#262520] pt-4 font-mono text-xs leading-relaxed text-[#D4D4CE]">
                  <code>{incidentData.rawTrace}</code>
                </pre>
              </details>
            )}
          </div>
        </article>
      </section>
    </main>
  );
}
