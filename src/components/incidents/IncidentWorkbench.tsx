"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Check,
  Clipboard,
  Clock3,
  GitCommitHorizontal,
  Pause,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import StatusBadge from "@/src/components/ui/StatusBadge";

const incidentDetails: Record<string, { service: string; signature: string; age: string }> = {
  "INC-4829": {
    service: "Payment Gateway",
    signature: "TypeError: Cannot read properties of undefined (reading 'currency')",
    age: "4 minutes ago",
  },
  "INC-4812": {
    service: "Orders API",
    signature: "PrismaClientKnownRequestError: Unique constraint failed",
    age: "18 minutes ago",
  },
  "INC-4786": {
    service: "Auth Microservice",
    signature: "ETIMEDOUT: upstream identity provider",
    age: "42 minutes ago",
  },
};

const tabs = [
  { id: "commits", label: "Culprit Commits", node: "NODE B" },
  { id: "logs", label: "Correlated Logs", node: "NODE A" },
  { id: "trace", label: "Raw Crash Stack Trace", node: "RAW PAYLOAD" },
] as const;

type TabId = (typeof tabs)[number]["id"];

const logLines = [
  ["2026-10-27T23:02:14.022Z", "INFO", "payment.intent.received", "request_id=req_9f2c  amount=124.90 USD"],
  ["2026-10-27T23:02:14.108Z", "INFO", "payment.provider.selected", "provider=atlas-pay  attempt=1"],
  ["2026-10-27T23:02:14.131Z", "WARN", "payment.currency.lookup", "merchant.currency=<undefined>"],
  ["2026-10-27T23:02:14.132Z", "ERROR", "payment.charge.create", "TypeError: Cannot read properties of undefined"],
  ["2026-10-27T23:02:14.146Z", "ERROR", "http.request.failed", "POST /v1/charges  status=500  request_id=req_9f2c"],
];

export default function IncidentWorkbench({ incidentId }: { incidentId: string }) {
  const [activeTab, setActiveTab] = useState<TabId>("commits");
  const [copyMessage, setCopyMessage] = useState("");
  const incident = incidentDetails[incidentId] ?? {
    service: "Payment Gateway",
    signature: "Unhandled service exception requires review",
    age: "Recently detected",
  };

  async function copyThreadId() {
    if (!navigator.clipboard) {
      setCopyMessage("Clipboard access is unavailable in this browser.");
      return;
    }

    try {
      await navigator.clipboard.writeText(incidentId);
      setCopyMessage("Thread ID copied.");
    } catch (error) {
      console.error("Unable to copy the incident thread ID.", error);
      setCopyMessage("Could not copy the thread ID. Check clipboard permissions and try again.");
    }
  }

  return (
    <main className="mx-auto w-full max-w-[1600px] px-5 pb-24 pt-10 sm:px-8 sm:pt-14 lg:px-12">
      <Link href="/dashboard" className="inline-flex items-center gap-2 text-base font-semibold text-slate-400 transition hover:text-cyan-200">
        <ArrowLeft aria-hidden="true" size={18} />
        Back to War Room
      </Link>

      <header className="mt-7 flex flex-col justify-between gap-6 xl:flex-row xl:items-end">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <p className="eyebrow">INCIDENT FORENSICS</p>
            <StatusBadge tone="critical"><span className="size-2 rounded-full bg-current" /> CRITICAL</StatusBadge>
            <StatusBadge tone="muted"><Clock3 aria-hidden="true" size={14} /> {incident.age}</StatusBadge>
          </div>
          <h1 className="mt-3 text-4xl font-extrabold tracking-tight text-white sm:text-5xl">{incidentId}</h1>
          <p className="mt-3 text-lg text-slate-300">{incident.service} <span className="mx-2 text-slate-600">/</span> {incident.signature}</p>
        </div>
        <div className="flex flex-col items-start gap-2 xl:items-end">
          <button
            type="button"
            onClick={copyThreadId}
            className="inline-flex h-12 items-center gap-2 rounded-xl border border-cyan-400/25 bg-cyan-400/[0.06] px-5 text-base font-semibold text-cyan-100 transition hover:border-cyan-300/60 hover:bg-cyan-400/[0.12]"
          >
            {copyMessage === "Thread ID copied." ? <Check aria-hidden="true" size={18} /> : <Clipboard aria-hidden="true" size={18} />}
            Copy Thread ID
          </button>
          <p aria-live="polite" className="min-h-5 text-sm text-cyan-200/80">{copyMessage}</p>
        </div>
      </header>

      <section aria-labelledby="diagnosis-heading" className="glass-card relative mt-9 overflow-hidden rounded-3xl p-6 sm:p-8">
        <div className="absolute -right-10 -top-20 size-64 rounded-full bg-cyan-400/[0.08] blur-[90px]" />
        <div className="relative">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="flex size-12 items-center justify-center rounded-xl border border-cyan-300/20 bg-cyan-300/[0.08] text-cyan-200">
                <Sparkles aria-hidden="true" size={22} />
              </span>
              <div>
                <p className="eyebrow">NODE C / GEMINI DIAGNOSIS</p>
                <h2 id="diagnosis-heading" className="mt-1 text-2xl font-bold text-white">Root-cause hypothesis</h2>
              </div>
            </div>
            <StatusBadge tone="ready" className="min-h-10 px-4 text-sm">RECOMMENDED ACTION&nbsp; / &nbsp;REVERT_PR</StatusBadge>
          </div>

          <div className="mt-7 grid gap-6 lg:grid-cols-[1fr_300px]">
            <div className="rounded-2xl border border-white/[0.07] bg-[#080e1a]/75 p-5 sm:p-6">
              <p className="text-lg leading-8 text-slate-200">
                A recent change removed the fallback currency mapping from the payment intent path. When a merchant profile omits a currency, the charge handler dereferences an undefined value and returns HTTP 500.
              </p>
              <div className="mt-5 flex flex-wrap items-center gap-3 text-base text-slate-400">
                <GitCommitHorizontal aria-hidden="true" size={19} className="text-cyan-300" />
                Suspected commit <code className="rounded-md border border-cyan-400/20 bg-cyan-400/[0.06] px-2 py-1 font-mono text-cyan-200">a81c4d2</code>
                <span>by <span className="text-slate-200">maya.chen</span></span>
              </div>
            </div>
            <div className="flex flex-col justify-center rounded-2xl border border-cyan-400/15 bg-cyan-400/[0.04] p-5">
              <p className="text-sm font-bold tracking-wider text-slate-400">MODEL CONFIDENCE</p>
              <p className="mt-2 text-4xl font-extrabold text-cyan-200">94<span className="text-2xl">%</span></p>
              <p className="mt-2 text-base leading-6 text-slate-400">Evidence agrees across the exception, correlated logs, and latest diff.</p>
            </div>
          </div>
        </div>
      </section>

      <section aria-labelledby="approval-heading" className="mt-6 rounded-2xl border border-blue-400/25 bg-gradient-to-r from-blue-950/45 via-[#0c1427]/90 to-cyan-950/30 p-6 shadow-[0_0_32px_rgba(37,99,235,0.08)] sm:p-8">
        <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
          <div className="flex items-start gap-4">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-xl border border-blue-300/20 bg-blue-300/[0.08] text-blue-200">
              <Pause aria-hidden="true" size={22} />
            </span>
            <div>
              <p className="eyebrow text-blue-200">NODE D / HUMAN APPROVAL STATION</p>
              <h2 id="approval-heading" className="mt-2 text-2xl font-bold text-white">Execution paused for your review</h2>
              <p className="mt-2 max-w-3xl text-base leading-7 text-slate-300">
                LangGraph is paused at <code className="font-mono text-cyan-200">interrupt()</code>. Healix will not open or merge a pull request until a human reviews the recommendation.
              </p>
            </div>
          </div>
          <button
            type="button"
            disabled
            title="Pull request approval is available in Phase 4."
            className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-xl border border-cyan-300/20 bg-cyan-300/10 px-5 text-base font-bold text-cyan-100 opacity-60"
          >
            <ShieldAlert aria-hidden="true" size={19} />
            Approve PR (Available in Phase 4)
          </button>
        </div>
      </section>

      <section className="mt-12">
        <div className="mb-5">
          <p className="eyebrow">INVESTIGATION EVIDENCE</p>
          <h2 className="mt-2 text-2xl font-bold text-white sm:text-3xl">Forensic timeline</h2>
        </div>
        <div className="glass-card overflow-hidden rounded-2xl">
          <div role="tablist" aria-label="Forensic evidence" className="flex overflow-x-auto border-b border-white/10 bg-white/[0.025]">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                id={`tab-${tab.id}`}
                aria-selected={activeTab === tab.id}
                aria-controls={`panel-${tab.id}`}
                onClick={() => setActiveTab(tab.id)}
                className={`flex min-h-16 shrink-0 flex-col justify-center border-b-2 px-5 text-left transition sm:px-7 ${
                  activeTab === tab.id
                    ? "border-cyan-300 bg-cyan-300/[0.06] text-white"
                    : "border-transparent text-slate-400 hover:bg-white/[0.03] hover:text-slate-200"
                }`}
              >
                <span className="text-base font-bold">{tab.label}</span>
                <span className="mt-1 font-mono text-xs tracking-wider text-slate-500">{tab.node}</span>
              </button>
            ))}
          </div>

          <div
            role="tabpanel"
            id={`panel-${activeTab}`}
            aria-labelledby={`tab-${activeTab}`}
            tabIndex={0}
            className="min-h-80 p-5 sm:p-8"
          >
            {activeTab === "commits" && (
              <div>
                <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-lg font-bold text-white">Suspect commit <code className="font-mono text-cyan-200">a81c4d2</code></p>
                    <p className="mt-1 text-base text-slate-400">maya.chen · 2 hours ago · <code className="font-mono">src/payments/charge.ts</code></p>
                  </div>
                  <StatusBadge tone="high">LIKELY CULPRIT</StatusBadge>
                </div>
                <div className="overflow-x-auto rounded-xl border border-white/10 bg-[#060a12] p-4 font-mono text-sm leading-8 sm:text-base">
                  <p className="text-slate-500">@@ -42,8 +42,6 @@ async function createCharge(intent: PaymentIntent) {"{"}</p>
                  <p className="whitespace-pre text-slate-300">  const merchant = await getMerchant(intent.merchantId);</p>
                  <p className="whitespace-pre rounded bg-rose-500/[0.08] text-rose-300">- const currency = merchant.currency ?? DEFAULT_CURRENCY;</p>
                  <p className="whitespace-pre rounded bg-emerald-500/[0.08] text-emerald-300">+ const currency = merchant.currency;</p>
                  <p className="whitespace-pre text-slate-300">  return provider.charge({"{"} amount: intent.amount, currency {"}"});</p>
                </div>
                <div className="mt-5 flex flex-wrap gap-3 text-sm text-slate-400">
                  <span className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2">+1 file changed</span>
                  <span className="rounded-lg border border-rose-500/20 bg-rose-500/[0.05] px-3 py-2 text-rose-300">−4 removed</span>
                  <span className="rounded-lg border border-emerald-500/20 bg-emerald-500/[0.05] px-3 py-2 text-emerald-300">+2 added</span>
                </div>
              </div>
            )}

            {activeTab === "logs" && (
              <div>
                <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-lg font-bold text-white">Correlated request timeline</p>
                    <p className="mt-1 text-base text-slate-400">5 events within 250 ms · request <code className="font-mono text-cyan-200">req_9f2c</code></p>
                  </div>
                  <StatusBadge tone="muted">NODE A / LOG CORRELATION</StatusBadge>
                </div>
                <div className="overflow-x-auto rounded-xl border border-white/10 bg-[#060a12] p-4 font-mono text-sm leading-8 sm:p-5 sm:text-base">
                  {logLines.map(([timestamp, level, eventName, message]) => (
                    <p key={timestamp} className="min-w-[900px] whitespace-pre">
                      <span className="text-slate-500">{timestamp}</span>{" "}
                      <span className={level === "ERROR" ? "text-rose-300" : level === "WARN" ? "text-amber-300" : "text-emerald-300"}>{level.padEnd(5)}</span>{" "}
                      <span className="text-cyan-200">{eventName.padEnd(30)}</span>{" "}
                      <span className={level === "ERROR" ? "text-rose-200" : "text-slate-300"}>{message}</span>
                    </p>
                  ))}
                </div>
              </div>
            )}

            {activeTab === "trace" && (
              <div>
                <div className="mb-5">
                  <p className="text-lg font-bold text-white">Raw crash stack trace</p>
                  <p className="mt-1 text-base text-slate-400">Captured from <code className="font-mono text-cyan-200">payment-gateway / production</code></p>
                </div>
                <pre className="overflow-x-auto rounded-xl border border-white/10 bg-[#060a12] p-5 font-mono text-sm leading-7 text-slate-300 sm:text-base">
                  <code>{`TypeError: Cannot read properties of undefined (reading 'currency')
    at createCharge (src/payments/charge.ts:47:29)
    at async processPayment (src/payments/process.ts:112:18)
    at async PaymentController.create (src/api/payment.controller.ts:68:22)
    at async requestHandler (src/http/handler.ts:31:11)

Request: POST /v1/charges
Request ID: req_9f2c
Service: payment-gateway@2.14.0
Environment: production`}</code>
                </pre>
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
