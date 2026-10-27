"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ArrowLeft,
  ArrowUpRight,
  Check,
  CirclePause,
  CirclePlay,
  Clock3,
  GitCommitHorizontal,
  GitPullRequest,
  Info,
  RotateCcw,
  ShieldCheck,
  TerminalSquare,
  ThumbsDown,
  ThumbsUp,
  TriangleAlert,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { DiffLine, Incident } from "@/lib/incidents";
import { cn } from "@/lib/utils";

type ApprovalStatus = "PENDING" | "APPROVED" | "REJECTED";

const actionLabels: Record<Incident["proposedAction"], string> = {
  REVERT_PR: "REVERT_PR",
  APPLY_CONFIG_PATCH: "APPLY_CONFIG_PATCH",
  MANUAL_INTERVENTION: "MANUAL_INTERVENTION",
  NO_ACTION: "NO_ACTION",
};

function DiffRow({ line }: { line: DiffLine }) {
  if (line.kind === "hunk") {
    return (
      <div className="border-y border-blue-400/[0.08] bg-blue-400/[0.05] px-3 py-1.5 font-mono text-[10px] text-blue-200/75">
        {line.text}
      </div>
    );
  }

  const isAddition = line.kind === "addition";
  const isDeletion = line.kind === "deletion";
  const tone = isAddition
    ? "bg-emerald-400/[0.08] text-emerald-200"
    : isDeletion
      ? "bg-rose-400/[0.08] text-rose-200"
      : "text-slate-400";
  const sign = isAddition ? "+" : isDeletion ? "−" : " ";

  return (
    <div className={cn("grid min-w-0 grid-cols-[36px_minmax(0,1fr)] font-mono text-[10px]", tone)}>
      <span className="select-none border-r border-white/[0.04] px-2 py-1 text-right text-slate-600">
        {isDeletion ? line.oldLine : isAddition ? line.newLine : line.newLine ?? line.oldLine}
      </span>
      <span className="min-w-0 overflow-x-auto whitespace-pre px-3 py-1">
        <span className="mr-2 inline-block w-2 select-none opacity-70">{sign}</span>
        {line.text}
      </span>
    </div>
  );
}

function NodeMarker({
  node,
  title,
  detail,
  state,
}: {
  node: string;
  title: string;
  detail: string;
  state: "complete" | "paused";
}) {
  const isPaused = state === "paused";

  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <span
        className={cn(
          "grid size-7 shrink-0 place-items-center rounded-lg border font-mono text-[10px]",
          isPaused
            ? "border-amber-400/30 bg-amber-400/[0.08] text-amber-200"
            : "border-cyan-400/20 bg-cyan-400/[0.06] text-cyan-200"
        )}
      >
        {isPaused ? <CirclePause className="size-3.5" /> : <Check className="size-3.5" />}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-[11px] font-medium text-slate-300">
          {node} · {title}
        </span>
        <span className="block truncate text-[10px] text-slate-500">{detail}</span>
      </span>
    </div>
  );
}

function ApprovalStation() {
  const [status, setStatus] = useState<ApprovalStatus>("PENDING");
  const [feedback, setFeedback] = useState("");

  const resultStyles = {
    PENDING: {
      label: "Awaiting decision",
      badge: "border-amber-400/25 bg-amber-400/[0.08] text-amber-200",
      description:
        "Node D is holding execution at interrupt(). Nothing will be staged until an operator reviews this recommendation.",
    },
    APPROVED: {
      label: "Approved · preview only",
      badge: "border-emerald-400/25 bg-emerald-400/[0.08] text-emerald-200",
      description:
        "Approval recorded in this local preview. No remediation was executed and no backend state was changed.",
    },
    REJECTED: {
      label: "Rejected · feedback recorded",
      badge: "border-rose-400/25 bg-rose-400/[0.08] text-rose-200",
      description:
        "Rejection recorded in this local preview. Feedback is visible here only and has not been sent to the graph.",
    },
  }[status];

  function rejectWithFeedback() {
    if (!feedback.trim()) {
      setFeedback("Please investigate further before applying this recommendation.");
    }
    setStatus("REJECTED");
  }

  function resetPreview() {
    setStatus("PENDING");
    setFeedback("");
  }

  return (
    <Card className="overflow-hidden border-amber-400/20 bg-[#0d1527]/85 py-0 ring-0 backdrop-blur-md">
      <div className="h-px bg-gradient-to-r from-transparent via-amber-300/50 to-transparent" />
      <CardHeader className="gap-3 px-4 pb-0 pt-4 sm:px-5 sm:pt-5">
        <div className="flex flex-wrap items-center gap-2">
          <Badge
            variant="outline"
            className="border-amber-400/25 bg-amber-400/[0.07] font-mono text-[9px] tracking-wide text-amber-200"
          >
            NODE D · HUMAN GATE
          </Badge>
          <span className="font-mono text-[10px] text-slate-500">
            langgraph.interrupt()
          </span>
        </div>
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
          <div>
            <CardTitle className="flex items-center gap-2 text-base text-slate-100">
              <CirclePause className="size-4 text-amber-300" />
              Human approval station
            </CardTitle>
            <CardDescription className="mt-1 text-xs leading-5 text-slate-400">
              Review the proposed action before execution continues. This is a
              non-blocking UI preview; the approval controls are not connected to
              the backend yet.
            </CardDescription>
          </div>
          <Badge
            variant="outline"
            className={cn("w-fit shrink-0 text-[10px]", resultStyles.badge)}
            aria-live="polite"
          >
            {resultStyles.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 p-4 sm:p-5">
        <Alert className="border-amber-400/15 bg-amber-400/[0.04]">
          <Info className="text-amber-300" />
          <AlertTitle className="text-xs text-amber-100">
            Graph execution paused at interrupt()
          </AlertTitle>
          <AlertDescription className="text-xs leading-5 text-slate-400">
            {resultStyles.description}
          </AlertDescription>
        </Alert>

        <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-end">
          <label className="flex flex-col gap-2 text-[11px] font-medium text-slate-300">
            Operator feedback
            <textarea
              aria-label="Operator feedback for rejection"
              className="min-h-20 w-full resize-y rounded-xl border border-white/10 bg-[#080e1a] px-3 py-2.5 text-xs leading-5 text-slate-200 outline-none transition placeholder:text-slate-600 focus:border-cyan-400/40 focus:ring-2 focus:ring-cyan-400/10"
              onChange={(event) => setFeedback(event.target.value)}
              placeholder="Optional context to include if you reject this recommendation…"
              value={feedback}
            />
          </label>
          <div className="flex flex-wrap gap-2">
            {status === "PENDING" ? (
              <>
                <Button
                  type="button"
                  onClick={() => setStatus("APPROVED")}
                  className="h-9 bg-cyan-400 px-3 text-xs font-semibold text-[#03151a] shadow-[0_0_20px_rgba(6,182,212,0.12)] hover:bg-cyan-300"
                >
                  <ThumbsUp data-icon="inline-start" />
                  Approve &amp; Stage Fix
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={rejectWithFeedback}
                  className="h-9 border-rose-400/20 bg-rose-400/[0.04] px-3 text-xs text-rose-200 hover:border-rose-400/35 hover:bg-rose-400/[0.09]"
                >
                  <ThumbsDown data-icon="inline-start" />
                  Reject with Feedback
                </Button>
              </>
            ) : (
              <Button
                type="button"
                variant="outline"
                onClick={resetPreview}
                className="h-9 border-white/10 bg-white/[0.03] px-3 text-xs text-slate-300 hover:bg-white/[0.06]"
              >
                <RotateCcw data-icon="inline-start" />
                Reset preview
              </Button>
            )}
          </div>
        </div>

        {status === "REJECTED" && (
          <div
            role="status"
            className="rounded-lg border border-rose-400/15 bg-rose-400/[0.04] px-3 py-2 text-xs text-rose-100/80"
          >
            Feedback: {feedback}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ExecutiveSummary({ incident }: { incident: Incident }) {
  const actionColors: Record<Incident["proposedAction"], string> = {
    REVERT_PR: "border-cyan-400/25 bg-cyan-400/[0.08] text-cyan-100",
    APPLY_CONFIG_PATCH: "border-blue-400/25 bg-blue-400/[0.08] text-blue-100",
    MANUAL_INTERVENTION: "border-amber-400/25 bg-amber-400/[0.08] text-amber-100",
    NO_ACTION: "border-emerald-400/25 bg-emerald-400/[0.08] text-emerald-100",
  };
  const riskLabel =
    incident.riskScore < 0.25
      ? "Low"
      : incident.riskScore < 0.6
        ? "Moderate"
        : "Elevated";

  return (
    <Card className="border-cyan-500/15 bg-[#0d1527]/80 py-0 ring-0 backdrop-blur-md">
      <CardHeader className="px-4 pb-0 pt-4 sm:px-5 sm:pt-5">
        <div className="flex flex-wrap items-center gap-2">
          <Badge
            variant="outline"
            className="border-cyan-400/20 bg-cyan-400/[0.06] font-mono text-[9px] tracking-wide text-cyan-200"
          >
            NODE C · GEMINI DIAGNOSIS
          </Badge>
          <span className="font-mono text-[10px] text-slate-500">
            model verdict · generated 14:12 UTC
          </span>
        </div>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="mt-2 text-lg text-slate-100">
              Executive summary
            </CardTitle>
            <CardDescription className="mt-1 text-xs text-slate-400">
              Failure hypothesis and recommended next action
            </CardDescription>
          </div>
          <span className="grid size-9 shrink-0 place-items-center rounded-xl border border-cyan-400/15 bg-cyan-400/[0.06] text-cyan-300">
            <ShieldCheck className="size-[18px]" />
          </span>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 p-4 sm:p-5">
        <div className="rounded-xl border border-white/[0.06] bg-[#080e1a]/75 p-4">
          <p className="mb-2 font-mono text-[9px] uppercase tracking-[0.16em] text-slate-500">
            Failure hypothesis
          </p>
          <p className="text-[13px] leading-6 text-slate-300">
            {incident.hypothesis}
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
          <div className="rounded-xl border border-cyan-400/15 bg-cyan-400/[0.035] p-3.5">
            <p className="mb-2 font-mono text-[9px] uppercase tracking-[0.16em] text-cyan-200/60">
              Suggested remedy
            </p>
            <Badge
              variant="outline"
              className={cn("font-mono text-[10px]", actionColors[incident.proposedAction])}
            >
              {actionLabels[incident.proposedAction]}
            </Badge>
            <p className="mt-2 text-xs leading-5 text-slate-400">
              {incident.actionReason}
            </p>
          </div>
          <div className="flex min-w-28 flex-col justify-center rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 sm:items-center">
            <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-slate-500">
              Risk estimate
            </p>
            <p className="mt-1 text-2xl font-semibold tracking-tight text-slate-100">
              {Math.round(incident.riskScore * 100)}
              <span className="text-sm text-slate-500">%</span>
            </p>
            <p className="text-[10px] text-cyan-200/80">{riskLabel} risk</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function CodeForensics({ incident }: { incident: Incident }) {
  return (
    <Card className="border-white/[0.07] bg-[#0d1527]/80 py-0 ring-0 backdrop-blur-md">
      <CardHeader className="px-4 pb-0 pt-4 sm:px-5 sm:pt-5">
        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className="border-blue-400/20 bg-blue-400/[0.06] font-mono text-[9px] tracking-wide text-blue-200"
          >
            NODE B · CODE FORENSICS
          </Badge>
          <span className="font-mono text-[10px] text-slate-500">last 24h</span>
        </div>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="mt-2 flex items-center gap-2 text-base text-slate-100">
              <GitCommitHorizontal className="size-4 text-blue-300" />
              Suspect commit
            </CardTitle>
            <CardDescription className="mt-1 text-xs text-slate-400">
              Matched against the failing stack frame
            </CardDescription>
          </div>
          <CardAction className="pt-1">
            <Badge
              variant="outline"
              className="border-rose-400/20 bg-rose-400/[0.05] font-mono text-[9px] text-rose-200"
            >
              MATCH
            </Badge>
          </CardAction>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 p-4 sm:p-5">
        <div className="rounded-xl border border-white/[0.06] bg-[#080e1a]/70 p-3.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="inline-flex items-center gap-2 text-xs font-medium text-slate-200">
              <span className="grid size-6 place-items-center rounded-full bg-blue-400/10 text-[9px] text-blue-200">
                {incident.commit.author
                  .split(" ")
                  .map((part) => part[0])
                  .join("")}
              </span>
              {incident.commit.author}
            </span>
            <span className="inline-flex items-center gap-1.5 font-mono text-[10px] text-slate-500">
              <Clock3 className="size-3" />
              {incident.commit.timestamp}
            </span>
          </div>
          <p className="mt-3 text-xs font-medium leading-5 text-slate-200">
            {incident.commit.message}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Badge
              variant="outline"
              className="border-white/10 bg-white/[0.025] font-mono text-[9px] text-slate-300"
            >
              <GitPullRequest data-icon="inline-start" />
              {incident.commit.sha}
            </Badge>
            <span className="font-mono text-[9px] text-emerald-300">
              +{incident.commit.additions}
            </span>
            <span className="font-mono text-[9px] text-rose-300">
              −{incident.commit.deletions}
            </span>
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {incident.commit.filesChanged.map((file) => (
              <span
                key={file}
                className="rounded-md border border-white/[0.06] bg-white/[0.02] px-2 py-1 font-mono text-[9px] text-slate-400"
              >
                {file}
              </span>
            ))}
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-white/[0.07] bg-[#070b13]">
          <div className="flex items-center justify-between border-b border-white/[0.06] px-3 py-2.5">
            <span className="font-mono text-[10px] text-slate-400">
              Unified diff
            </span>
            <span className="font-mono text-[9px] text-slate-600">
              {incident.commit.filesChanged[0]}
            </span>
          </div>
          <div className="overflow-x-auto py-1">
            {incident.commit.diff.map((line, index) => (
              <DiffRow key={`${line.kind}-${index}`} line={line} />
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function Telemetry({ incident }: { incident: Incident }) {
  return (
    <div className="flex flex-col gap-4">
      <Card className="overflow-hidden border-white/[0.07] bg-[#0d1527]/80 py-0 ring-0 backdrop-blur-md">
        <CardHeader className="flex flex-row items-center justify-between border-b border-white/[0.06] px-4 py-3.5">
          <div className="flex items-center gap-2.5">
            <span className="grid size-8 place-items-center rounded-lg border border-cyan-400/15 bg-cyan-400/[0.06] text-cyan-300">
              <TerminalSquare className="size-4" />
            </span>
            <div>
              <CardTitle className="text-sm text-slate-200">
                Correlated telemetry
              </CardTitle>
              <CardDescription className="mt-0.5 font-mono text-[9px] text-slate-500">
                NODE A · ±10 MIN WINDOW
              </CardDescription>
            </div>
          </div>
          <Badge
            variant="outline"
            className="border-white/[0.08] bg-white/[0.02] font-mono text-[9px] text-slate-400"
          >
            {incident.correlatedLogs.length} EVENTS
          </Badge>
        </CardHeader>
        <CardContent className="p-0">
          <div className="max-h-[280px] overflow-auto px-3 py-3">
            {incident.correlatedLogs.map((log, index) => (
              <p
                key={`${incident.id}-log-${index}`}
                className="break-all py-1 font-mono text-[10px] leading-[1.8] text-slate-400"
              >
                <span className="text-slate-600">{log.slice(0, 15)}</span>{" "}
                <span
                  className={
                    log.includes("[ERROR]")
                      ? "text-rose-300"
                      : log.includes("[WARN ]")
                        ? "text-amber-200"
                        : "text-cyan-100/75"
                  }
                >
                  {log.slice(16)}
                </span>
              </p>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden border-rose-400/10 bg-[#0d1527]/80 py-0 ring-0 backdrop-blur-md">
        <CardHeader className="flex flex-row items-center justify-between border-b border-white/[0.06] px-4 py-3.5">
          <div className="flex items-center gap-2.5">
            <span className="grid size-8 place-items-center rounded-lg border border-rose-400/15 bg-rose-400/[0.06] text-rose-300">
              <TriangleAlert className="size-4" />
            </span>
            <div>
              <CardTitle className="text-sm text-slate-200">
                Raw failing stack trace
              </CardTitle>
              <CardDescription className="mt-0.5 font-mono text-[9px] text-slate-500">
                {incident.endpoint}
              </CardDescription>
            </div>
          </div>
          <Badge
            variant="outline"
            className="border-rose-400/15 bg-rose-400/[0.04] font-mono text-[9px] text-rose-200"
          >
            RAW
          </Badge>
        </CardHeader>
        <CardContent className="p-0">
          <pre className="overflow-x-auto px-4 py-3 font-mono text-[10px] leading-[1.8] text-rose-100/75">
            <code>
              {incident.stackTrace.map((line, index) => (
                <span className="block" key={`${incident.id}-stack-${index}`}>
                  <span className="mr-3 inline-block w-4 select-none text-right text-slate-700">
                    {index + 1}
                  </span>
                  {line}
                </span>
              ))}
            </code>
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}

export function TriageWorkbench({ incident }: { incident: Incident }) {
  return (
    <main className="mx-auto flex w-full max-w-[1480px] flex-1 flex-col gap-5 px-4 py-7 sm:px-6 lg:gap-6 lg:px-8 lg:py-9">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <Link
            href="/incidents"
            className="mb-4 inline-flex items-center gap-1.5 text-xs text-slate-400 transition hover:text-cyan-200"
          >
            <ArrowLeft className="size-3.5" />
            Back to incidents
          </Link>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-cyan-300/75">
              Forensic workbench
            </span>
            <span className="size-1 rounded-full bg-slate-600" />
            <span className="font-mono text-[10px] text-slate-500">
              {incident.id}
            </span>
          </div>
          <h1 className="max-w-3xl text-2xl font-semibold tracking-[-0.04em] text-slate-100 sm:text-3xl">
            {incident.title}
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
            {incident.summary}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge
            variant="outline"
            className={cn(
              "font-mono text-[10px]",
              incident.severity === "P1"
                ? "border-rose-500/25 bg-rose-500/[0.08] text-rose-200"
                : incident.severity === "P2"
                  ? "border-amber-400/25 bg-amber-400/[0.08] text-amber-200"
                  : "border-sky-400/25 bg-sky-400/[0.08] text-sky-200"
            )}
          >
            {incident.severity} SEVERITY
          </Badge>
          <Badge
            variant="outline"
            className="border-white/10 bg-white/[0.025] font-mono text-[10px] text-slate-300"
          >
            {incident.service}
          </Badge>
          <Link
            href="/incidents"
            className="inline-flex size-8 items-center justify-center rounded-lg border border-white/10 text-slate-400 transition hover:border-cyan-400/25 hover:text-cyan-200"
            aria-label="Return to incident roster"
          >
            <ArrowUpRight className="size-4" />
          </Link>
        </div>
      </div>

      <section
        aria-label="Pipeline progress"
        className="grid gap-2 rounded-2xl border border-white/[0.06] bg-[#0b1322]/65 p-3 sm:grid-cols-2 sm:p-4 lg:grid-cols-4"
      >
        <NodeMarker
          node="A"
          title="Telemetry"
          detail={`${incident.occurrences.toLocaleString()} events clustered`}
          state="complete"
        />
        <Separator className="bg-white/[0.06] sm:hidden" />
        <NodeMarker
          node="B"
          title="Code forensics"
          detail={`${incident.commit.filesChanged.length} matching files`}
          state="complete"
        />
        <Separator className="bg-white/[0.06] sm:hidden" />
        <NodeMarker
          node="C"
          title="Executive verdict"
          detail={`${actionLabels[incident.proposedAction]} proposed`}
          state="complete"
        />
        <Separator className="bg-white/[0.06] sm:hidden" />
        <NodeMarker
          node="D"
          title="Human approval"
          detail="Execution paused · waiting"
          state="paused"
        />
      </section>

      <ExecutiveSummary incident={incident} />
      <ApprovalStation />

      <div className="grid min-w-0 grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)]">
        <CodeForensics incident={incident} />
        <Telemetry incident={incident} />
      </div>

      <div className="flex flex-col gap-2 border-t border-white/[0.06] pt-4 text-[10px] text-slate-600 sm:flex-row sm:items-center sm:justify-between">
        <p>
          Incident window · {incident.firstSeen} — {incident.lastSeen} ·{" "}
          {incident.occurrences.toLocaleString()} raw events
        </p>
        <span className="inline-flex items-center gap-1.5 font-mono">
          <CirclePlay className="size-3 text-cyan-400/70" />
          NODE D CHECKPOINT ACTIVE
        </span>
      </div>
    </main>
  );
}
