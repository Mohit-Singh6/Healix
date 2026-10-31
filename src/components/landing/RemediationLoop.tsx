"use client";

import { useEffect, useState } from "react";
import { Check, ChevronRight } from "lucide-react";

type PipelinePhase =
  | { type: "processing"; activeStep: 0 | 1 | 2 }
  | { type: "approval-pending" }
  | { type: "approved" }
  | { type: "reset" };

const pipeline = [
  {
    number: "01",
    title: "Telemetry Ingestion",
    detail: "Webhook capture, error logs, and stack-trace parsing",
    trace: "POST /api/v1/webhooks/pagerduty (200 OK)",
    traceClassName: "text-[#A1A19A]",
  },
  {
    number: "02",
    title: "AST & Blame Correlation",
    detail: "Vector search over repo graph and commit history",
    trace: "git blame -L 41,45 (commit 4fa01b)",
    traceClassName: "text-[#A1A19A]",
  },
  {
    number: "03",
    title: "API-Driven Remediation",
    detail: "Diagnoses the issue and stages a fix directly via GitHub API or your hosting platform.",
    trace: "octokit.pulls.create(...)",
    traceClassName: "text-[#10B981]",
  },
  {
    number: "04",
    title: "Human Approval Gate",
    detail: "Nothing reaches production automatically. Review the drafted branch and merge only when ready.",
    trace: "status: pending_human_review",
    traceClassName: "text-[#F59E0B]",
  },
];

function phaseAt(elapsed: number): PipelinePhase {
  const cycleTime = elapsed % 8000;

  if (cycleTime < 1500) return { type: "processing", activeStep: 0 };
  if (cycleTime < 3000) return { type: "processing", activeStep: 1 };
  if (cycleTime < 4500) return { type: "processing", activeStep: 2 };
  if (cycleTime < 6000) return { type: "approval-pending" };
  if (cycleTime < 7500) return { type: "approved" };
  return { type: "reset" };
}

function isStepComplete(phase: PipelinePhase, index: number) {
  if (phase.type === "processing") return index < phase.activeStep;
  return phase.type === "approval-pending" || phase.type === "approved" ? index < 3 : false;
}

function isStepActive(phase: PipelinePhase, index: number) {
  if (phase.type === "processing") return phase.activeStep === index;
  return index === 3 && (phase.type === "approval-pending" || phase.type === "approved");
}

export default function RemediationLoop() {
  const [phase, setPhase] = useState<PipelinePhase>({ type: "processing", activeStep: 0 });

  useEffect(() => {
    const startedAt = Date.now();
    const interval = window.setInterval(() => {
      setPhase(phaseAt(Date.now() - startedAt));
    }, 50);

    return () => window.clearInterval(interval);
  }, []);

  return (
    <section id="architecture" className="scroll-mt-24 border-b border-[#2B2A24] py-16 sm:py-20">
      <div className="mb-9 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.15em] text-[#F59E0B]">The remediation loop</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">From raw signal to reviewed fix.</h2>
        </div>
        <p className="max-w-md text-sm leading-6 text-[#A1A19A]">
          Every step preserves the evidence trail, from the first webhook to the branch your team reviews.
        </p>
      </div>
      <ol className="grid grid-cols-1 items-stretch gap-4 md:grid-cols-4">
        {pipeline.map((step, index) => {
          const active = isStepActive(phase, index);
          const complete = isStepComplete(phase, index);
          const approvalPending = index === 3 && phase.type === "approval-pending";
          const approved = index === 3 && phase.type === "approved";

          return (
            <li
              key={step.number}
              className={`flex min-h-56 flex-col rounded-lg border bg-[#1B1B18] p-5 transition-all duration-300 ease-in-out md:p-6 ${
                approved
                  ? "border-emerald-500/50"
                  : active
                    ? "border-[#F59E0B]/40"
                    : "border-[#2B2A24]"
              }`}
            >
              <div className="flex items-center gap-3 font-mono text-xs tracking-wide">
                <span
                  className={`shrink-0 transition-all duration-300 ease-in-out ${
                    complete ? "text-[#10B981]" : active ? "text-[#F59E0B]" : "text-[#77766F]"
                  }`}
                >
                  {complete ? <Check aria-label={`${step.number} complete`} size={14} /> : step.number}
                </span>
                <span aria-hidden="true" className="relative h-px w-full bg-[#2B2A24]">
                  <span
                    className={`absolute inset-y-0 left-0 transition-all duration-300 ease-in-out ${
                      complete || active ? "w-full bg-[#F59E0B]" : "w-0 bg-[#F59E0B]"
                    }`}
                  />
                </span>
                {index < pipeline.length - 1 && (
                  <ChevronRight aria-hidden="true" size={14} className="shrink-0 text-[#77766F]" />
                )}
                <span className="shrink-0 text-[#77766F]"></span>
              </div>

              <h3 className="mt-7 text-lg font-semibold leading-6 text-[#E2E2DC]">{step.title}</h3>
              <p className="mt-3 flex-1 text-sm leading-6 text-[#A1A19A]">{step.detail}</p>

              {approved ? (
                <p
                  aria-live="polite"
                  className="mt-5 inline-flex max-w-full items-center gap-1.5 self-start rounded-sm border border-emerald-500/40 bg-emerald-950/60 px-2 py-1 font-mono text-[10px] leading-5 text-emerald-400 transition-all duration-300 ease-in-out"
                >
                  <Check aria-hidden="true" size={12} />
                  APPROVED BY OPERATOR
                </p>
              ) : (
                <p
                  aria-live={index === 3 ? "polite" : undefined}
                  className={`mt-5 inline-flex max-w-full items-center gap-1.5 self-start rounded-sm border px-2 py-1 font-mono text-[10px] leading-5 break-all transition-all duration-300 ease-in-out ${
                    approvalPending
                      ? "animate-pulse border-[#F59E0B]/40 bg-[#F59E0B]/10 text-[#F59E0B]"
                      : active && index === 2
                        ? "border-[#F59E0B]/40 bg-[#F59E0B]/10 text-[#F59E0B]"
                        : "border-[#2B2A24] bg-[#121211] " + step.traceClassName
                  }`}
                >
                  {approvalPending && <span aria-hidden="true">⏸</span>}
                  {approvalPending ? "status: pending_human_review" : step.trace}
                </p>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
