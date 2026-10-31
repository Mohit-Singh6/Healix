"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowUpRight,
  Check,
  Clipboard,
  Clock3,
  GitCommitHorizontal,
  Pause,
} from "lucide-react";
import StatusBadge from "@/src/components/ui/StatusBadge";
import { getMockIncidentData } from "@/src/components/incidents/incident-data";
import type { IncidentData } from "@/src/components/incidents/incident-data";

const tabs = [
  { id: "diff", label: "Suspect Diff" },
  { id: "logs", label: "Correlated Logs (±10m)" },
  { id: "trace", label: "Raw Stack Trace" },
] as const;

type TabId = (typeof tabs)[number]["id"];

export default function IncidentWorkbench({
  incidentId,
  incident,
}: {
  incidentId: string;
  incident?: IncidentData;
}) {
  const [activeTab, setActiveTab] = useState<TabId>("diff");
  const [copyMessage, setCopyMessage] = useState("");
  const [incidentData, setIncidentData] = useState(() => incident ?? getMockIncidentData(incidentId));
  const [isResolving, setIsResolving] = useState(false);

  useEffect(() => {
    if (!isResolving) return;

    const timeout = window.setTimeout(() => {
      setIncidentData((current) => ({ ...current, status: "RESOLVED" }));
      setIsResolving(false);
    }, 900);

    return () => window.clearTimeout(timeout);
  }, [isResolving]);

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

  const severityTone = incidentData.severity === "CRITICAL"
    ? "critical"
    : incidentData.severity === "HIGH"
      ? "high"
      : "muted";
  const isResolved = incidentData.status === "RESOLVED";
  const lifecycleSteps = [
    { time: "08:10:02", label: "Ingested", complete: true },
    { time: "08:10:05", label: "Diagnosed", complete: true },
    { time: "08:12:14", label: isResolved ? "Operator Approved" : "Approval Gate", complete: isResolved },
    { time: "08:12:18", label: "PR #142 Ready", complete: isResolved },
  ];

  return (
    <main className="mx-auto w-full max-w-[1600px] flex-1 bg-[#121211] px-5 pb-20 pt-8 text-[#EDEDE8] sm:px-8 lg:px-12">
      <Link href="/dashboard" className="inline-flex items-center gap-2 font-mono text-xs text-[#8A8A82] transition-colors hover:text-[#EDEDE8]">
        <ArrowLeft aria-hidden="true" size={14} />
        War Room
      </Link>

      <ol aria-label="Incident lifecycle" className="mt-6 grid grid-cols-2 gap-x-4 gap-y-3 rounded-lg border border-[#262520] bg-[#181816] px-4 py-3 sm:flex sm:items-center sm:gap-y-3 sm:px-5">
        {lifecycleSteps.map((step, index) => (
          <li key={step.label} className="flex min-w-0 flex-1 items-center">
            <div className="flex min-w-0 items-center gap-2">
              <span className={`size-2.5 shrink-0 rounded-full border ${step.complete ? "border-emerald-500 bg-emerald-500" : index === 2 ? "border-[#F59E0B] bg-[#F59E0B]/30" : "border-[#5B5A52] bg-transparent"}`} />
              <span className="flex min-w-0 flex-col">
                <time className={`font-mono text-xs ${step.complete ? "text-[#D4D4CE]" : "text-[#8E8E86]"}`}>{step.time}</time>
                <span className={`text-sm leading-relaxed ${step.complete ? "text-[#D4D4CE]" : index === 2 ? "text-[#F59E0B]" : "text-[#8E8E86]"}`}>{step.label}</span>
              </span>
            </div>
            {index < lifecycleSteps.length - 1 && (
              <span aria-hidden="true" className={`mx-3 hidden h-px min-w-4 flex-1 sm:block ${step.complete ? "bg-emerald-800" : "bg-[#383730]"}`} />
            )}
          </li>
        ))}
      </ol>

      <header className="mt-6 flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <p className="font-mono text-xs tracking-wider text-[#8A8A82]">INCIDENT FORENSICS</p>
            <StatusBadge tone={severityTone}><span className="size-1.5 rounded-full bg-current" /> {incidentData.severity}</StatusBadge>
            <StatusBadge tone="muted"><Clock3 aria-hidden="true" size={12} /> <time dateTime={incidentData.timestamp}>{incidentData.timestamp.replace("T", " ").replace("Z", " UTC")}</time></StatusBadge>
            <StatusBadge tone="muted">{incidentData.service}</StatusBadge>
            <StatusBadge tone={isResolved ? "healthy" : incidentData.status === "PENDING_APPROVAL" ? "high" : "muted"}>
              {incidentData.status.replaceAll("_", " ")}
            </StatusBadge>
          </div>
          <h1 className="mt-3 font-mono text-3xl font-semibold tracking-tight text-[#EDEDE8] sm:text-4xl">{incidentData.id}</h1>
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
          isResolved ? "border-emerald-800/40 bg-emerald-950/20" : "border-[#D97706]/40 bg-[#1E1C14]"
        } lg:flex-row lg:items-center`}
      >
        <div className="flex items-start gap-4">
          <span className={`flex size-10 shrink-0 items-center justify-center rounded-md border ${
            isResolved ? "border-emerald-800/40 bg-emerald-950/40 text-emerald-400" : "border-[#D97706]/30 bg-[#F59E0B]/10 text-[#F59E0B]"
          }`}>
            {isResolved ? <Check aria-hidden="true" size={18} /> : <Pause aria-hidden="true" size={18} />}
          </span>
          <div>
            <p className={`font-mono text-xs tracking-wide ${isResolved ? "text-emerald-400" : "text-[#F59E0B]"}`}>
              {isResolved ? "INCIDENT RESOLVED" : "Execution Paused at Node D (Human Approval Gate)"}
            </p>
            <h2 id="approval-heading" className="mt-2 text-lg font-semibold text-[#EDEDE8]">
              {isResolving ? "Resolving..." : isResolved ? "Operator approved the proposed change" : "Review the proposed change"}
            </h2>
            <p className="mt-1 text-sm leading-6 text-[#A1A19A]">
              {isResolved
                ? "The mock pull request is ready for review."
                : <>Gemini staged fix branch <code className="font-mono text-[#D4D4CE]">&apos;fix/currency-deref&apos;</code>. Awaiting operator review.</>}
            </p>
            {isResolved && (
              <a
                href="https://github.com/healix-labs/payment-gateway/pull/142"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex items-center gap-1 font-mono text-xs text-emerald-400 underline underline-offset-4 hover:text-emerald-300"
              >
                View mock pull request 142 <ArrowUpRight aria-hidden="true" size={13} />
              </a>
            )}
          </div>
        </div>
        {!isResolved && (
          <div className="flex shrink-0 flex-wrap gap-2 lg:justify-end">
            <button
              type="button"
              disabled={isResolving}
              onClick={() => setIsResolving(true)}
              className="inline-flex min-h-9 items-center justify-center rounded bg-[#F59E0B] px-4 font-mono text-xs font-semibold text-black transition-colors hover:bg-[#D97706] disabled:cursor-wait disabled:opacity-70"
            >
              {isResolving ? "Resolving..." : "Approve & Open PR"}
            </button>
            <button
              type="button"
              disabled
              title="Incident dismissal is not connected in this preview."
              className="inline-flex min-h-9 items-center justify-center rounded border border-[#383730] bg-transparent px-4 font-mono text-xs text-[#8A8A82] transition-colors hover:text-[#EDEDE8] disabled:cursor-not-allowed disabled:opacity-70"
            >
              Dismiss Incident
            </button>
          </div>
        )}
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
          <p className="mt-5 text-sm leading-relaxed text-[#D4D4CE]">{incidentData.hypothesis}</p>
          <div className="mt-5 border-t border-[#262520] pt-4">
            <p className="font-mono text-xs uppercase tracking-wider text-[#8E8E86]">Suspect commit</p>
            <p className="mt-2 inline-flex flex-wrap items-center gap-1.5 rounded border border-[#383730] bg-[#121211] px-2.5 py-1.5 font-mono text-sm text-[#D4D4CE]">
              <GitCommitHorizontal aria-hidden="true" size={14} className="text-[#F59E0B]" />
              commit {incidentData.suspectCommit.hash} by {incidentData.suspectCommit.author}
            </p>
            <p className="mt-2 text-sm leading-relaxed text-[#A1A19A]">{incidentData.suspectCommit.time} · {incidentData.suspectCommit.file}</p>
          </div>
          <div className="mt-5 flex items-center justify-between border-t border-[#262520] pt-4">
            <span className="font-mono text-xs uppercase tracking-wider text-[#8E8E86]">Model confidence</span>
            <span className="font-mono text-sm text-[#F59E0B]">{incidentData.confidence}%</span>
          </div>
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
                <span className="text-[#8E8E86]">Blame:</span> commit {incidentData.suspectCommit.hash} by {incidentData.suspectCommit.author} (&quot;{incidentData.suspectCommit.message}&quot;)
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
                <p className="mb-4 text-[#8E8E86]">@@ suspect change · {incidentData.suspectCommit.file}:{incidentData.suspectCommit.functionName}</p>
                {incidentData.diff.removed.map((line, index) => (
                  <p key={`removed-${index}`} className="break-words border-l-2 border-rose-500 bg-rose-950/40 px-3 py-1 text-rose-300">
                    <span className="line-through">- {line}</span>
                  </p>
                ))}
                {incidentData.diff.added.map((line, index) => (
                  <p key={`added-${index}`} className="break-words border-l-2 border-emerald-500 bg-emerald-950/40 px-3 py-1 text-emerald-300">
                    + {line}
                  </p>
                ))}
              </div>
            )}

            {activeTab === "logs" && (
              <div className="max-h-80 overflow-auto font-mono text-xs leading-relaxed">
                {incidentData.logs.map((log, index) => {
                  const levelClass = log.includes("ERROR")
                    ? "text-rose-300"
                    : log.includes("WARN")
                      ? "text-[#F59E0B]"
                      : "text-emerald-400";
                  return (
                    <p key={`${index}-${log}`} className="grid gap-x-3 border-b border-[#262520] py-2 leading-relaxed sm:grid-cols-[minmax(0,1fr)]">
                      <span className={levelClass}>{log}</span>
                    </p>
                  );
                })}
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
