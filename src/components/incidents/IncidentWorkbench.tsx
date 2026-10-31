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
  { id: "diff", label: "[ Suspect Diff ]" },
  { id: "logs", label: "[ Correlated Logs (±10m) ]" },
  { id: "trace", label: "[ Raw Trace ]" },
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
  const [activeTab, setActiveTab] = useState<TabId>("diff");
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
    <main className="mx-auto w-full max-w-[1600px] flex-1 bg-[#121211] px-5 pb-20 pt-8 text-[#EDEDE8] sm:px-8 lg:px-12">
      <Link href="/dashboard" className="inline-flex items-center gap-2 font-mono text-xs text-[#8A8A82] transition-colors hover:text-[#EDEDE8]">
        <ArrowLeft aria-hidden="true" size={14} />
        War Room
      </Link>

      <header className="mt-6 flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <p className="font-mono text-xs tracking-wider text-[#8A8A82]">INCIDENT FORENSICS</p>
            <StatusBadge tone="critical"><span className="size-1.5 rounded-full bg-current" /> CRITICAL</StatusBadge>
            <StatusBadge tone="muted"><Clock3 aria-hidden="true" size={12} /> {incident.age}</StatusBadge>
            <StatusBadge tone="muted">{incident.service}</StatusBadge>
          </div>
          <h1 className="mt-3 font-mono text-3xl font-semibold tracking-tight text-[#EDEDE8] sm:text-4xl">{incidentId}</h1>
          <p className="mt-2 max-w-4xl break-words font-mono text-sm text-[#A1A19A]">{incident.signature}</p>
        </div>
        <div className="flex flex-col items-start gap-1 lg:items-end">
          <button
            type="button"
            onClick={copyThreadId}
            className="inline-flex min-h-9 items-center gap-2 rounded border border-[#383730] bg-[#1B1B18] px-3 font-mono text-xs text-[#A1A19A] transition-colors hover:text-[#EDEDE8]"
          >
            {copyMessage === "Thread ID copied." ? <Check aria-hidden="true" size={14} /> : <Clipboard aria-hidden="true" size={14} />}
            Copy Thread ID
          </button>
          <p aria-live="polite" className="min-h-4 text-[11px] text-[#8A8A82]">{copyMessage}</p>
        </div>
      </header>

      <section
        aria-labelledby="approval-heading"
        className="mt-7 flex flex-col justify-between gap-5 rounded-lg border border-[#D97706]/40 bg-[#1E1C14] p-5 lg:flex-row lg:items-center"
      >
        <div className="flex items-start gap-4">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-md border border-[#D97706]/30 bg-[#F59E0B]/10 text-[#F59E0B]">
            <Pause aria-hidden="true" size={18} />
          </span>
          <div>
            <p className="font-mono text-xs tracking-wide text-[#F59E0B]">
              ⏸ EXECUTION INTERRUPTED AT NODE D (Human Approval Gate)
            </p>
            <h2 id="approval-heading" className="mt-2 text-lg font-semibold text-[#EDEDE8]">Review the proposed change</h2>
            <p className="mt-1 text-sm leading-6 text-[#A1A19A]">
              Gemini staged fix branch <code className="font-mono text-[#D4D4CE]">&apos;fix/currency-deref&apos;</code>. Awaiting operator review.
            </p>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2 lg:justify-end">
          <button
            type="button"
            disabled
            title="Pull request approval is not connected in this preview."
            className="inline-flex min-h-9 items-center justify-center rounded bg-[#F59E0B] px-4 font-mono text-xs font-semibold text-black transition-colors hover:bg-[#D97706] disabled:cursor-not-allowed disabled:opacity-70"
          >
            [ Approve &amp; Open PR ]
          </button>
          <button
            type="button"
            disabled
            title="Incident dismissal is not connected in this preview."
            className="inline-flex min-h-9 items-center justify-center rounded border border-[#383730] bg-transparent px-4 font-mono text-xs text-[#8A8A82] transition-colors hover:text-[#EDEDE8] disabled:cursor-not-allowed disabled:opacity-70"
          >
            [ Dismiss Incident ]
          </button>
        </div>
      </section>

      <section aria-label="Forensic evidence" className="mt-7 grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
        <article className="rounded-lg border border-[#262520] bg-[#181816] p-5">
          <div className="flex items-center gap-3">
            <span className="flex size-9 items-center justify-center rounded-md border border-[#383730] bg-[#121211] text-[#F59E0B]">
              <Sparkles aria-hidden="true" size={17} />
            </span>
            <div>
              <p className="font-mono text-[11px] tracking-wider text-[#8A8A82]">ROOT-CAUSE ANALYSIS</p>
              <h2 className="mt-1 text-base font-semibold text-[#EDEDE8]">Diagnosis &amp; cause</h2>
            </div>
          </div>
          <p className="mt-5 text-sm leading-relaxed text-[#D4D4CE]">
            A recent change removed the fallback currency mapping from the payment intent path. When a merchant profile omits a currency, the charge handler dereferences an undefined value and returns HTTP 500.
          </p>
          <div className="mt-5 border-t border-[#262520] pt-4">
            <p className="font-mono text-[11px] uppercase tracking-wider text-[#8A8A82]">Suspect commit</p>
            <p className="mt-2 inline-flex flex-wrap items-center gap-1.5 rounded border border-[#383730] bg-[#121211] px-2.5 py-1.5 font-mono text-xs text-[#D4D4CE]">
              <GitCommitHorizontal aria-hidden="true" size={14} className="text-[#F59E0B]" />
              commit a81c4d2 by maya.chen
            </p>
          </div>
          <div className="mt-5 flex items-center justify-between border-t border-[#262520] pt-4">
            <span className="font-mono text-[11px] uppercase tracking-wider text-[#8A8A82]">Model confidence</span>
            <span className="font-mono text-sm text-[#F59E0B]">94%</span>
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
                className={`min-h-11 shrink-0 border-b-2 px-4 font-mono text-[11px] transition-colors ${
                  activeTab === tab.id
                    ? "border-[#F59E0B] bg-[#F59E0B]/5 text-[#F59E0B]"
                    : "border-transparent text-[#8A8A82] hover:text-[#EDEDE8]"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div
            role="tabpanel"
            id={`panel-${activeTab}`}
            aria-labelledby={`tab-${activeTab}`}
            tabIndex={0}
            className="min-h-72 p-4 sm:p-5"
          >
            {activeTab === "diff" && (
              <div className="overflow-x-auto font-mono text-xs leading-7">
                <p className="mb-3 text-[#77766F]">@@ -42,8 +42,6 @@ async function createCharge(intent: PaymentIntent)</p>
                <p className="break-words text-[#A1A19A]">  const merchant = await getMerchant(intent.merchantId);</p>
                <p className="break-words border-l-2 border-rose-500 bg-rose-950/40 px-2 text-rose-300">
                  <span className="line-through">- const currency = merchant.currency ?? DEFAULT_CURRENCY;</span>
                </p>
                <p className="break-words border-l-2 border-emerald-500 bg-emerald-950/40 px-2 text-emerald-300">
                  + const currency = merchant.currency;
                </p>
                <p className="break-words text-[#A1A19A]">  return provider.charge(&#123; amount: intent.amount, currency &#125;);</p>
              </div>
            )}

            {activeTab === "logs" && (
              <div className="max-h-80 overflow-auto font-mono text-[11px] leading-6">
                {logLines.map(([timestamp, level, eventName, message]) => (
                  <p key={timestamp} className="grid gap-x-3 border-b border-[#262520] py-2 sm:grid-cols-[170px_52px_minmax(150px,1fr)]">
                    <span className="text-[#77766F]">{timestamp}</span>
                    <span className={level === "ERROR" ? "text-rose-300" : level === "WARN" ? "text-[#F59E0B]" : "text-emerald-400"}>{level}</span>
                    <span className="min-w-0 break-words text-[#A1A19A]">{eventName} · {message}</span>
                  </p>
                ))}
              </div>
            )}

            {activeTab === "trace" && (
              <pre className="max-h-80 overflow-auto whitespace-pre-wrap break-words font-mono text-xs leading-6 text-[#D4D4CE]">
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
            )}
          </div>
        </article>
      </section>
    </main>
  );
}
