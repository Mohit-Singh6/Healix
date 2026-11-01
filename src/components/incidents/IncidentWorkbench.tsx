"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowUpRight,
  Check,
  CircleAlert,
  Clipboard,
  Copy,
  GitCommitHorizontal,
  Pause,
  X,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import type { IncidentData } from "@/src/components/incidents/incident-data";
import { formatDateTimeIST, formatMarkdownTimesIST, formatTimeIST, formatTimestampIST } from "@/src/lib/date-time";

type ReportSection = {
  depth: number;
  heading: string;
  markdown: string;
};

const tabs = [
  { id: "diff", label: "Suspect Diff" },
  { id: "logs", label: "Correlated Logs (±10m)" },
  { id: "trace", label: "Raw Stack Trace" },
] as const;

type TabId = (typeof tabs)[number]["id"];

function timeLabel(value: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : formatTimeIST(date);
}

function actionLabel(incident: IncidentData): string {
  return incident.proposedAction === "APPLY_CONFIG_PATCH"
    ? "Approve & Apply Patch"
    : "Approve & Open PR";
}

function parseReportSections(markdown: string): ReportSection[] {
  const sections: ReportSection[] = [];
  let current: ReportSection | null = null;
  const content: string[] = [];

  function saveCurrent() {
    if (current) {
      sections.push({ ...current, markdown: content.join("\n").trim() });
      content.length = 0;
    }
  }

  for (const line of markdown.split(/\r?\n/)) {
    const heading = line.match(/^(#{1,3})\s+(.+?)\s*#*\s*$/);
    if (heading) {
      if (!current && content.some((item) => item.trim())) {
        sections.push({ depth: 2, heading: "", markdown: content.join("\n").trim() });
        content.length = 0;
      }
      saveCurrent();
      current = { depth: heading[1].length, heading: heading[2], markdown: "" };
    } else {
      content.push(line);
    }
  }

  saveCurrent();
  if (!sections.length && content.some((line) => line.trim())) {
    sections.push({ depth: 2, heading: "", markdown: content.join("\n").trim() });
  }
  return sections;
}

function TimelineMarkdown({ markdown }: { markdown: string }) {
  const timestampPattern =
    /\b(\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(?::\d{2})?(?:\s?UTC|Z)?|\d{2}:\d{2}(?::\d{2})?(?:\s?UTC)?)\b/i;
  const entries: string[] = [];
  let previousLineWasBlank = true;

  for (const rawLine of markdown.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) {
      previousLineWasBlank = true;
      continue;
    }

    const isListItem = /^(?:[-*+]|\d+\.)\s+/.test(line);
    if (!entries.length || isListItem || previousLineWasBlank || timestampPattern.test(line)) {
      entries.push(line.replace(/^(?:[-*+]|\d+\.)\s+/, ""));
    } else {
      entries[entries.length - 1] += ` ${line}`;
    }
    previousLineWasBlank = false;
  }

  return (
    <div className="ml-2 flex flex-col gap-1 border-l border-[#2B2A24] pl-4">
      {entries.map((entry, index) => {
        const timestamp = entry.match(timestampPattern);
        const rawDescription = entry
          .replace(timestampPattern, "")
          .replace(/^[\s:—–-]+/, "");
        const hasUnmatchedBold = (rawDescription.match(/\*\*/g)?.length ?? 0) % 2 === 1;
        const description = hasUnmatchedBold ? rawDescription.replace(/\*\*/g, "") : rawDescription;

        return (
          <div key={`${index}-${entry}`} className="relative grid grid-cols-[minmax(8.5rem,auto)_minmax(0,1fr)] items-start gap-x-4 py-2">
            <span aria-hidden="true" className="absolute -left-[21px] top-3.5 size-2 rounded-full bg-[#3B3A34]" />
            <span className="pt-0.5 font-mono text-xs text-[#F59E0B]">{timestamp ? formatTimestampIST(timestamp[1]) : ""}</span>
            <div className="min-w-0 text-sm leading-relaxed text-[#D4D4CE] [&_p]:my-0 [&_p+p]:mt-2 [&_code]:whitespace-normal">
              <ReactMarkdown>{description}</ReactMarkdown>
            </div>
          </div>
        );
      })}
    </div>
  );
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
  const [postMortemCopyMessage, setPostMortemCopyMessage] = useState("");
  const [incidentData, setIncidentData] = useState(incident);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [decisionError, setDecisionError] = useState("");
  const [rejectionFeedback, setRejectionFeedback] = useState("");

  const isPending = incidentData.status === "PENDING_APPROVAL" &&
    incidentData.humanApprovalStatus === "PENDING";
  const isResolved = incidentData.status === "RESOLVED";
  const isDismissed = incidentData.status === "DISMISSED";
  const isMitigating = incidentData.status === "MITIGATING";
  const isManualFollowUp = incidentData.proposedAction === "MANUAL_INTERVENTION";
  const isNoActionRecommended = incidentData.proposedAction === "NO_ACTION";
  const isTriageInProgress = incidentData.status === "INVESTIGATING" && !incidentData.proposedAction;
  const requiresOperatorApproval =
    incidentData.proposedAction === "REVERT_PR" ||
    incidentData.proposedAction === "BUGFIX_PR" ||
    incidentData.proposedAction === "APPLY_CONFIG_PATCH";
  const reportSections = incidentData.postMortemMarkdown
    ? parseReportSections(incidentData.postMortemMarkdown)
    : [];
  const reportTitle = reportSections.find((section) => section.depth === 1)?.heading ?? "Incident Post-Mortem";
  const statusLabel = isResolved
    ? "Resolved"
    : isDismissed
      ? "Dismissed"
      : incidentData.humanApprovalStatus === "APPROVED"
        ? "Approved · In progress"
        : isPending
          ? "Pending review"
          : isMitigating
            ? "Mitigating"
            : "Investigating";

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

  async function copyPostMortem() {
    if (!navigator.clipboard) {
      setPostMortemCopyMessage("Clipboard access is unavailable in this browser.");
      return;
    }

    try {
      await navigator.clipboard.writeText(incidentData.postMortemMarkdown ?? "");
      setPostMortemCopyMessage("Markdown copied.");
    } catch (error) {
      console.error("Unable to copy the post-mortem Markdown.", error);
      setPostMortemCopyMessage("Could not copy Markdown. Check clipboard permissions and try again.");
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

  const diagnosisState = incidentData.proposedAction
    ? "complete"
    : isTriageInProgress
      ? "current"
      : "upcoming";
  const reviewState = !requiresOperatorApproval
    ? (incidentData.proposedAction ? "skipped" : "upcoming")
    : incidentData.humanApprovalStatus !== "PENDING"
      ? "complete"
      : isPending
        ? "current"
        : "upcoming";
  const remediationState = isResolved || isNoActionRecommended
    ? "complete"
    : isDismissed
      ? "skipped"
      : isMitigating || isManualFollowUp
        ? "current"
        : "upcoming";
  const lifecycleSteps = [
    { time: timeLabel(incidentData.timestamp), label: "Ingested", state: "complete" },
    {
      time: null,
      label: diagnosisState === "current" ? "Diagnosing" : "Diagnosed",
      state: diagnosisState,
    },
    {
      time: timeLabel(incidentData.decidedAt),
      label: !requiresOperatorApproval
        ? incidentData.proposedAction ? "Approval skipped" : "Operator review"
        : incidentData.humanApprovalStatus === "APPROVED"
          ? "Operator approved"
          : incidentData.humanApprovalStatus === "REJECTED"
            ? "Operator rejected"
            : "Operator review",
      state: reviewState,
    },
    {
      time: incidentData.remediationPrUrl || isResolved ? timeLabel(incidentData.updatedAt) : null,
      label: isNoActionRecommended
        ? "No action needed"
        : isManualFollowUp
          ? "Manual follow-up"
          : isDismissed
            ? "Remediation stopped"
            : isResolved
              ? "Remediation complete"
              : incidentData.remediationPrUrl
                ? "PR created"
                : "Remediation",
      state: remediationState,
    },
  ] as const;

  return (
    <main className="mx-auto w-full max-w-[1600px] flex-1 bg-[#121211] px-5 pb-20 pt-8 text-[#EDEDE8] sm:px-8 lg:px-12">
      <Link href="/dashboard" className="inline-flex min-h-11 items-center gap-2 rounded-md border border-[#2B2A24] bg-[#181816] px-3 font-mono text-sm text-[#A1A19A] transition-colors hover:bg-[#232320] hover:text-[#EDEDE8]">
        <ArrowLeft aria-hidden="true" size={17} />
        War Room
      </Link>

      <div className="mt-6 overflow-x-auto rounded-lg border border-[#262520] bg-[#181816]">
        <ol aria-label="Incident lifecycle" className="grid min-w-[680px] grid-cols-4 px-4 py-4 sm:px-5">
          {lifecycleSteps.map((step, index) => (
            <li key={`${index}-${step.label}`} className="min-w-0" aria-current={step.state === "current" ? "step" : undefined}>
              <div className="flex items-center pr-4">
                <span
                  aria-hidden="true"
                  className={`relative z-10 size-3 shrink-0 rounded-full border-2 ${
                    step.state === "complete"
                      ? "border-emerald-400 bg-emerald-400"
                      : step.state === "current"
                        ? "border-[#F59E0B] bg-[#1B1B18] shadow-[0_0_0_3px_#F59E0B22]"
                        : step.state === "skipped"
                          ? "border-[#5B5A52] bg-[#292923]"
                          : "border-[#5B5A52] bg-[#181816]"
                  }`}
                />
                {index < lifecycleSteps.length - 1 && (
                  <span
                    aria-hidden="true"
                    className={`h-px flex-1 ${
                      step.state === "complete"
                        ? "bg-emerald-800"
                        : step.state === "current"
                          ? "bg-[#F59E0B]/50"
                          : "bg-[#383730]"
                    }`}
                  />
                )}
              </div>
              <div className="mt-2 min-h-10 pr-4">
                <span className="block h-4">
                  {step.time && (
                    <time
                      dateTime={index === 0 ? incidentData.timestamp : index === 2 ? incidentData.decidedAt ?? undefined : incidentData.updatedAt}
                      className={`font-mono text-xs ${step.state === "complete" ? "text-[#D4D4CE]" : "text-[#8E8E86]"}`}
                    >
                      {step.time}
                    </time>
                  )}
                </span>
                <span className={`block text-sm leading-relaxed ${
                  step.state === "complete"
                    ? "text-[#D4D4CE]"
                    : step.state === "current"
                      ? "font-medium text-[#F59E0B]"
                      : step.state === "skipped"
                        ? "text-[#77766F]"
                        : "text-[#8E8E86]"
                }`}>{step.label}</span>
              </div>
            </li>
          ))}
        </ol>
      </div>

      <header className="mb-6 mt-6 flex flex-col justify-between gap-4 md:flex-row md:items-start">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-mono text-3xl font-bold tracking-tight text-[#EDEDE8] sm:text-4xl">{incidentData.displayId}</h1>
            <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-xs font-medium ${
              isResolved
                ? "border-emerald-500/30 bg-emerald-950/60 text-emerald-400"
                : isDismissed
                  ? "border-rose-500/30 bg-rose-950/50 text-rose-400"
                  : incidentData.humanApprovalStatus === "APPROVED"
                    ? "border-emerald-500/30 bg-emerald-950/60 text-emerald-400"
                    : isPending
                      ? "border-[#F59E0B]/30 bg-[#F59E0B]/10 text-[#F59E0B]"
                      : "border-[#383730] bg-[#1B1B18] text-[#A1A19A]"
            }`}>
              <span className={`size-1.5 rounded-full ${isResolved || incidentData.humanApprovalStatus === "APPROVED" ? "bg-emerald-400" : isDismissed ? "bg-rose-400" : isPending ? "bg-[#F59E0B]" : "bg-[#77766F]"}`} />
              {statusLabel}
            </span>
            <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-xs font-medium ${
              incidentData.severity === "CRITICAL"
                ? "border-rose-500/30 bg-rose-950/50 text-rose-400"
                : incidentData.severity === "HIGH"
                  ? "border-[#F59E0B]/30 bg-[#F59E0B]/10 text-[#F59E0B]"
                  : "border-[#383730] bg-[#1B1B18] text-[#A1A19A]"
            }`}>
              <span className={`size-1.5 rounded-full ${incidentData.severity === "CRITICAL" ? "bg-rose-400" : incidentData.severity === "HIGH" ? "bg-[#F59E0B]" : "bg-[#77766F]"}`} />
              {incidentData.severity}
            </span>
          </div>
          <p className="mt-2 break-words font-mono text-base text-[#D4D4CE]">{incidentData.title}</p>
          <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 pt-1 font-mono text-xs text-[#8E8E86]">
            <span className="rounded border border-[#2B2A24] bg-[#1E1E1B] px-2 py-0.5 text-[#EDEDE8]">{incidentData.service}</span>
            <span aria-hidden="true">·</span>
            <span>Detected <time dateTime={incidentData.timestamp}>{formatDateTimeIST(incidentData.timestamp)}</time></span>
            <span aria-hidden="true">·</span>
            <span className="max-w-full break-words">
              Root cause: {incidentData.suspectCommit.hash
                ? `Regression commit ${incidentData.suspectCommit.hash.slice(0, 8)}`
                : incidentData.proposedAction
                  ? "no regression commit linked"
                  : "under investigation"}
            </span>
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-start gap-1 pt-1 md:items-end">
          <button
            type="button"
            onClick={copyThreadId}
            className="inline-flex min-h-10 items-center gap-1.5 rounded-md border border-[#2B2A24] bg-[#181816] px-3 font-mono text-sm text-[#A1A19A] transition-colors hover:bg-[#232320] hover:text-[#EDEDE8]"
          >
            {copyMessage === "Incident ID copied." ? <Check aria-hidden="true" size={16} /> : <Copy aria-hidden="true" size={16} />}
            Copy ID
          </button>
          <p aria-live="polite" className="min-h-4 text-xs text-[#8A8A82]">{copyMessage}</p>
        </div>
      </header>

      <section
        aria-labelledby="approval-heading"
        className={`mt-7 flex flex-col justify-between gap-5 rounded-lg border p-5 transition-colors ${
          isResolved
            ? "border-emerald-800/40 bg-emerald-950/20"
            : isPending || isMitigating
              ? "border-[#D97706]/40 bg-[#1E1C14]"
              : "border-[#383730] bg-[#181816]"
        } lg:flex-row lg:items-center`}
      >
        <div className="flex items-start gap-4">
          <span className={`flex size-10 shrink-0 items-center justify-center rounded-md border ${
            isResolved
              ? "border-emerald-800/40 bg-emerald-950/40 text-emerald-400"
              : isPending || isMitigating
                ? "border-[#D97706]/30 bg-[#F59E0B]/10 text-[#F59E0B]"
                : "border-[#383730] bg-[#121211] text-[#A1A19A]"
          }`}>
            {isResolved ? <Check aria-hidden="true" size={18} /> : isPending ? <Pause aria-hidden="true" size={18} /> : isDismissed ? <X aria-hidden="true" size={18} /> : <CircleAlert aria-hidden="true" size={18} />}
          </span>
          <div>
            <p className={`font-mono text-xs tracking-wide ${
              isResolved
                ? "text-emerald-400"
                : isPending || isMitigating
                  ? "text-[#F59E0B]"
                  : "text-[#A1A19A]"
            }`}>
              {isResolved
                ? "REMEDIATION COMPLETED"
                : isDismissed
                  ? "OPERATOR DECISION · REJECTED"
                  : isPending
                    ? "AWAITING OPERATOR APPROVAL"
                    : isMitigating
                      ? "REMEDIATION IN PROGRESS"
                      : isManualFollowUp
                        ? "AUTOMATED TRIAGE COMPLETE · HUMAN ACTION NEEDED"
                        : isNoActionRecommended
                          ? "AUTOMATED TRIAGE COMPLETE"
                          : "AUTOMATED TRIAGE IN PROGRESS"}
            </p>
            <h2 id="approval-heading" className="mt-2 text-lg font-semibold text-[#EDEDE8]">
              {isPending
                ? "Review the proposed action"
                : isResolved
                  ? "Approved remediation completed"
                  : isDismissed
                    ? "The proposed action was rejected"
                    : isMitigating
                      ? "The decision was recorded; remediation needs attention"
                      : isManualFollowUp
                        ? "Automated triage completed"
                        : isNoActionRecommended
                          ? "No automated remediation is needed"
                          : "Automated triage is investigating"}
            </h2>
            <p className="mt-1 text-base leading-6 text-[#A1A19A]">
              {incidentData.actionSummary ?? (isTriageInProgress
                ? "Healix is correlating logs and investigating the affected service."
                : "Automated triage has not proposed a remediation yet.")}
            </p>
            {(isManualFollowUp || isNoActionRecommended) && incidentData.hypothesis !== incidentData.actionSummary && (
              <p className="mt-2 max-w-3xl whitespace-pre-wrap text-base leading-relaxed text-[#D4D4CE]">{incidentData.hypothesis}</p>
            )}
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
              <p className="mt-2 max-w-3xl text-base leading-relaxed text-[#D4D4CE]">
                <span className="font-mono text-xs uppercase text-[#8E8E86]">Operator / execution note: </span>
                {incidentData.operatorFeedback}
              </p>
            )}
            {incidentData.reviewedBy && incidentData.decidedAt && (
              <p className="mt-2 font-mono text-xs text-[#8E8E86]">
                Reviewed by {incidentData.reviewedBy} · {formatDateTimeIST(incidentData.decidedAt)}
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
          <p className="mt-5 whitespace-pre-wrap text-base leading-relaxed text-[#D4D4CE]">{incidentData.hypothesis}</p>
          <div className="mt-5 border-t border-[#262520] pt-4">
            <p className="font-mono text-xs uppercase tracking-wider text-[#8E8E86]">Suspect commit</p>
            {incidentData.suspectCommit.hash || incidentData.suspectCommit.file ? (
              <>
                <p className="mt-2 inline-flex flex-wrap items-center gap-1.5 rounded border border-[#383730] bg-[#121211] px-2.5 py-1.5 font-mono text-sm text-[#D4D4CE]">
                  <GitCommitHorizontal aria-hidden="true" size={14} className="text-[#F59E0B]" />
                  {incidentData.suspectCommit.hash ? `commit ${incidentData.suspectCommit.hash}` : "Suspect source"}
                  {incidentData.suspectCommit.author && ` by ${incidentData.suspectCommit.author}`}
                </p>
                <p className="mt-2 text-base leading-relaxed text-[#A1A19A]">
                  {incidentData.suspectCommit.file ?? "Source file unavailable"}
                  {incidentData.suspectCommit.functionName ? ` · ${incidentData.suspectCommit.functionName}` : ""}
                  {incidentData.suspectCommit.time ? ` · ${formatDateTimeIST(incidentData.suspectCommit.time)}` : ""}
                </p>
                {incidentData.suspectCommit.message && <p className="mt-2 text-base text-[#8E8E86]">{incidentData.suspectCommit.message}</p>}
              </>
            ) : (
              <p className="mt-2 text-base text-[#8E8E86]">No suspect commit has been identified.</p>
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
              <div className="min-h-[340px] overflow-x-auto font-mono text-sm leading-relaxed">
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
              <div className="max-h-80 overflow-auto font-mono text-sm leading-relaxed">
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
                <pre className="mt-4 max-h-80 overflow-auto whitespace-pre-wrap break-words border-t border-[#262520] pt-4 font-mono text-sm leading-relaxed text-[#D4D4CE]">
                  <code>{incidentData.rawTrace}</code>
                </pre>
              </details>
            )}
          </div>
        </article>
      </section>

      <section aria-labelledby="postmortem-heading" className="mt-7 rounded-lg border border-[#262520] bg-[#161614] p-6 shadow-xl sm:p-8 md:p-10">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <p className="font-mono text-lg uppercase tracking-wider text-[#8E8E86]">POST-MORTEM REPORT</p>
            {incidentData.postMortemMarkdown && <span className="font-mono text-sm text-emerald-400">REPORT GENERATED</span>}
          </div>
          {incidentData.postMortemMarkdown && (
            <div className="flex flex-col items-start gap-1 sm:items-end">
              <button
                type="button"
                onClick={() => void copyPostMortem()}
                className="inline-flex items-center gap-1.5 rounded border border-[#2B2A24] px-3 py-1.5 font-mono text-xs text-[#8E8E86] transition-colors hover:text-[#EDEDE8]"
              >
                {postMortemCopyMessage === "Markdown copied." ? <Check aria-hidden="true" size={14} /> : <Clipboard aria-hidden="true" size={14} />}
                Copy Markdown
              </button>
              <p aria-live="polite" className="min-h-4 text-xs text-[#8E8E86]">{postMortemCopyMessage}</p>
            </div>
          )}
        </header>
        <h2 id="postmortem-heading" className="mt-6 text-2xl font-bold leading-tight tracking-tight text-[#EDEDE8] md:text-3xl">
          {reportTitle}
        </h2>
        {incidentData.postMortemMarkdown ? (
          <article className="mt-6 max-w-none text-base leading-relaxed text-[#D4D4CE] [&_a]:text-[#F59E0B] [&_a]:underline [&_a]:underline-offset-4 [&_blockquote]:my-4 [&_blockquote]:border-l-2 [&_blockquote]:border-[#F59E0B]/50 [&_blockquote]:pl-4 [&_blockquote]:text-[#A1A19A] [&_code]:rounded [&_code]:border [&_code]:border-[#2E2E28] [&_code]:bg-[#1E1E1B] [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-xs [&_h1]:mb-6 [&_h1]:mt-1 [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:leading-tight [&_h1]:tracking-tight [&_h1]:text-[#EDEDE8] [&_h2]:mb-4 [&_h2]:mt-8 [&_h2]:border-b [&_h2]:border-[#2B2A24] [&_h2]:pb-2 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-[#EDEDE8] [&_h3]:mb-2 [&_h3]:mt-6 [&_h3]:text-base [&_h3]:font-semibold [&_h3]:text-[#EDEDE8] [&_li]:my-1 [&_ol]:my-3 [&_ol]:list-decimal [&_ol]:pl-6 [&_p]:my-3 [&_pre]:my-4 [&_pre]:overflow-x-auto [&_pre]:rounded-md [&_pre]:border [&_pre]:border-[#2B2A24] [&_pre]:bg-[#121211] [&_pre]:p-4 [&_pre]:font-mono [&_pre]:text-sm [&_pre]:leading-relaxed [&_pre_code]:border-0 [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_strong]:font-semibold [&_strong]:text-[#EDEDE8] [&_table]:my-4 [&_table]:w-full [&_td]:border [&_td]:border-[#2B2A24] [&_td]:px-3 [&_td]:py-2 [&_th]:border [&_th]:border-[#2B2A24] [&_th]:bg-[#1B1B18] [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_th]:text-[#EDEDE8] [&_ul]:my-3 [&_ul]:list-disc [&_ul]:pl-6 md:[&_h1]:text-3xl md:[&_h2]:text-xl">
            {reportSections.filter((section) => !(section.depth === 1 && section.heading === reportTitle)).map((section, index) => {
              const isSummary = section.heading.toLowerCase().includes("executive summary");
              const isTimeline = section.heading.toLowerCase().includes("timeline");
              const HeadingTag = section.depth === 1 ? "h1" : section.depth === 2 ? "h2" : "h3";
              return (
                <section key={`${section.heading}-${index}`}>
                  {section.heading && <HeadingTag>{section.heading}</HeadingTag>}
                  {isSummary ? (
                    <div className="my-4 rounded-r-md border-l-4 border-emerald-500 bg-[#1A1A17] p-5 text-base leading-relaxed text-[#E2E2DC] [&_p]:my-0 [&_p+p]:mt-3">
                      <ReactMarkdown>{formatMarkdownTimesIST(section.markdown)}</ReactMarkdown>
                    </div>
                  ) : isTimeline ? (
                    <TimelineMarkdown markdown={section.markdown} />
                  ) : (
                    <ReactMarkdown>{formatMarkdownTimesIST(section.markdown)}</ReactMarkdown>
                  )}
                </section>
              );
            })}
          </article>
        ) : (
          <div className="px-5 py-6 sm:px-6">
            <p className="text-sm leading-relaxed text-[#D4D4CE]">
              The post-mortem will appear here after triage and remediation finish.
            </p>
            <p className="mt-2 font-mono text-xs text-[#8E8E86]">
              Current incident state: {incidentData.status.replaceAll("_", " ")}
            </p>
          </div>
        )}
      </section>
    </main>
  );
}
