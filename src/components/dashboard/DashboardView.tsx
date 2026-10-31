"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { FormEvent, ReactNode } from "react";
import {
  ArrowDownRight,
  ArrowRight,
  CircleAlert,
  Copy,
  ExternalLink,
  Plus,
  X,
} from "lucide-react";
import StatusBadge from "@/src/components/ui/StatusBadge";

const projects = [
  {
    name: "Payment Gateway",
    repo: "healix-labs/payment-gateway",
    branch: "main",
    health: "Degraded",
    tone: "high" as const,
    webhook: "payment-gateway",
    incidents: 2,
    latency: "842 ms",
    recentEvents: ["healthy", "healthy", "degraded", "healthy", "degraded"],
  },
  {
    name: "Auth Microservice",
    repo: "healix-labs/auth-service",
    branch: "main",
    health: "Healthy",
    tone: "healthy" as const,
    webhook: "auth-microservice",
    incidents: 0,
    latency: "96 ms",
    recentEvents: ["healthy", "healthy", "healthy", "healthy", "healthy"],
  },
  {
    name: "Orders API",
    repo: "healix-labs/orders-api",
    branch: "production",
    health: "Healthy",
    tone: "healthy" as const,
    webhook: "orders-api",
    incidents: 1,
    latency: "128 ms",
    recentEvents: ["healthy", "deploy", "healthy", "healthy", "healthy"],
  },
];

const incidents = [
  {
    id: "INC-4829",
    severity: "CRITICAL",
    signature: "TypeError: Cannot read properties of undefined (reading 'currency')",
    service: "Payment Gateway",
    volume: "1,284 events",
    age: "4 min ago",
    tone: "critical" as const,
    status: "PENDING_APPROVAL",
    target: "src/payments/charge.ts:createCharge",
  },
  {
    id: "INC-4812",
    severity: "HIGH",
    signature: "PrismaClientKnownRequestError: Unique constraint failed",
    service: "Orders API",
    volume: "342 events",
    age: "18 min ago",
    tone: "high" as const,
    status: "PENDING_APPROVAL",
    target: "src/orders/create-order.ts:createOrder",
  },
  {
    id: "INC-4786",
    severity: "HIGH",
    signature: "ETIMEDOUT: upstream identity provider",
    service: "Auth Microservice",
    volume: "86 events",
    age: "42 min ago",
    tone: "high" as const,
    status: "INVESTIGATING",
    target: "src/auth/provider-client.ts:introspect",
  },
];

function MetricCell({ label, value, detail, highlight = false }: {
  label: string;
  value: string;
  detail: ReactNode;
  highlight?: boolean;
}) {
  return (
    <div className="min-w-0 px-4 py-2 first:pl-0 last:pr-0 sm:px-6">
      <p className="font-mono text-xs uppercase tracking-wider text-[#8E8E86]">{label}</p>
      <p className={`mt-2 font-mono text-2xl ${highlight ? "text-[#F59E0B]" : "text-[#EDEDE8]"}`}>{value}</p>
      <div className="mt-1 text-sm leading-relaxed text-[#D4D4CE]">{detail}</div>
    </div>
  );
}

async function copyWebhookUrl(project: (typeof projects)[number]) {
    const url = `${window.location.origin}/api/webhooks/alerts?service=${encodeURIComponent(project.webhook)}`;
    if (!navigator.clipboard) {
      throw new Error("Clipboard access is unavailable in this browser.");
    }

    try {
      await navigator.clipboard.writeText(url);
    } catch (error) {
      console.error("Unable to copy the ingestion webhook URL.", error);
      throw error;
    }
}

export default function DashboardView() {
  const [isAddProjectOpen, setIsAddProjectOpen] = useState(false);
  const [copyMessage, setCopyMessage] = useState("");

  useEffect(() => {
    if (!isAddProjectOpen) return;

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setIsAddProjectOpen(false);
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [isAddProjectOpen]);

  function submitProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
  }

  async function handleCopyWebhook(project: (typeof projects)[number]) {
    try {
      await copyWebhookUrl(project);
      setCopyMessage(`${project.name} webhook URL copied.`);
    } catch (error) {
      setCopyMessage(error instanceof Error ? error.message : "Could not copy webhook URL.");
    }
  }

  return (
    <main className="mx-auto w-full max-w-[1600px] flex-1 bg-[#121211] px-5 pb-20 pt-9 text-[#EDEDE8] sm:px-8 lg:px-12">
      <header className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <p className="font-mono text-xs uppercase tracking-wider text-[#A1A19A]">Workspace / war-room</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[#EDEDE8] sm:text-4xl">War Room</h1>
          <p className="mt-2 text-sm text-[#A1A19A]">Your services, signals, and response queue at a glance.</p>
        </div>
      </header>

      <section
        aria-label="Workspace telemetry"
        className="mt-8 grid grid-cols-1 divide-y divide-[#2B2A24] rounded-lg border border-[#2B2A24] bg-[#1B1B18] p-4 sm:grid-cols-3 sm:divide-x sm:divide-y-0"
      >
        <MetricCell
          label="Active Services"
          value="12"
          detail={
            <div className="flex items-center gap-1.5" role="img" aria-label="12 services, 10 healthy and 2 degraded">
              {Array.from({ length: 12 }, (_, index) => (
                <span
                  key={index}
                  className={`h-3.5 w-1.5 rounded-sm ${index === 3 || index === 8 ? "bg-[#F59E0B]" : "bg-emerald-500"}`}
                />
              ))}
              <span className="ml-1 text-xs text-[#8E8E86]">All webhooks active</span>
            </div>
          }
        />
        <MetricCell label="Incidents Resolved" value="1,482" detail="94% resolved autonomously via API" />
        <MetricCell
          label="Awaiting Operator Gate"
          value="3"
          detail={
            <Link href="#incidents" className="inline-flex items-center gap-1 text-sm text-[#F59E0B] transition-colors hover:text-[#FDBA32]">
              Inspect Queue <ArrowRight aria-hidden="true" size={14} />
            </Link>
          }
          highlight
        />
      </section>

      <section id="projects" className="mt-12 scroll-mt-20">
        <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <p className="font-mono text-xs uppercase tracking-wider text-[#8E8E86]">Service health / telemetry matrix</p>
            <h2 className="mt-2 text-xl font-semibold text-[#EDEDE8]">Monitored projects</h2>
          </div>
          <button
            type="button"
            onClick={() => setIsAddProjectOpen(true)}
            className="inline-flex min-h-8 items-center gap-1.5 self-start rounded border border-[#383730] bg-[#181816] px-2.5 font-mono text-xs text-[#EDEDE8] transition-colors hover:border-[#F59E0B] sm:self-auto"
          >
            <Plus aria-hidden="true" size={13} /> Register New Service
          </button>
        </div>
        <div className="overflow-hidden rounded-lg border border-[#232320] bg-[#181816]">
          <div className="hidden grid-cols-[minmax(190px,1.3fr)_minmax(150px,1fr)_repeat(3,minmax(100px,.65fr))_minmax(190px,1fr)] items-center gap-4 border-b border-[#2B2A24] bg-[#141412] px-5 py-3 font-mono text-xs uppercase tracking-wider text-[#8E8E86] xl:grid">
            <span>Service / Event Spectrum</span><span>Health</span><span>Branch</span><span>P95 Latency</span><span>Open Incidents</span><span>Actions</span>
          </div>
          <div className="divide-y divide-[#262520]">
            {projects.map((project) => (
              <article
                key={project.name}
                className="grid gap-4 px-4 py-4 transition-colors hover:bg-[#1D1D19] sm:px-5 xl:grid-cols-[minmax(190px,1.3fr)_minmax(150px,1fr)_repeat(3,minmax(100px,.65fr))_minmax(190px,1fr)] xl:items-center"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <h3 className="text-sm font-semibold text-[#EDEDE8]">{project.name}</h3>
                    <span className="flex items-center gap-1" role="img" aria-label="Recent event rolling spectrum">
                      {project.recentEvents.map((event, index) => (
                        <span
                          key={`${event}-${index}`}
                          title={event}
                          className={`h-2.5 w-3 rounded-sm ${
                            event === "degraded" ? "bg-[#F59E0B]/80" : event === "deploy" ? "bg-sky-400/70" : "bg-emerald-500/70"
                          }`}
                        />
                      ))}
                    </span>
                  </div>
                  <p className="mt-1 truncate font-mono text-xs leading-relaxed text-[#8E8E86]">{project.repo}</p>
                </div>
                <div>
                  <p className="mb-1 font-mono text-xs uppercase tracking-wider text-[#8E8E86] xl:hidden">Health</p>
                  <span className={`inline-flex items-center gap-2 text-sm font-medium ${project.tone === "high" ? "text-[#F59E0B]" : "text-emerald-400"}`}>
                    <span className={`size-2 rounded-full ${project.tone === "high" ? "bg-[#F59E0B]" : "bg-emerald-400"}`} />
                    {project.health}
                  </span>
                </div>
                <div>
                  <p className="mb-1 font-mono text-xs uppercase tracking-wider text-[#8E8E86] xl:hidden">Active branch</p>
                  <span className="font-mono text-sm text-[#D4D4CE]">{project.branch}</span>
                </div>
                <div>
                  <p className="mb-1 font-mono text-xs uppercase tracking-wider text-[#8E8E86] xl:hidden">P95 latency</p>
                  <span className={`font-mono text-sm ${Number.parseInt(project.latency, 10) > 500 ? "text-[#F59E0B]" : "text-[#D4D4CE]"}`}>
                    {project.latency}
                  </span>
                  {Number.parseInt(project.latency, 10) > 500 && (
                    <span className="ml-2 rounded border border-[#F59E0B]/30 bg-[#F59E0B]/10 px-1.5 py-0.5 font-mono text-xs font-semibold text-[#F59E0B]">HIGH</span>
                  )}
                </div>
                <div>
                  <p className="mb-1 font-mono text-xs uppercase tracking-wider text-[#8E8E86] xl:hidden">Open incidents</p>
                  <span className={`font-mono text-sm ${project.incidents > 0 ? "text-[#D4D4CE]" : "text-[#8E8E86]"}`}>{project.incidents}</span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => void handleCopyWebhook(project)}
                    className="inline-flex min-h-8 items-center gap-1.5 rounded border border-[#383730] bg-transparent px-2.5 font-mono text-xs text-[#A1A19A] transition-colors hover:border-[#F59E0B]/50 hover:text-[#EDEDE8]"
                  >
                    <Copy aria-hidden="true" size={14} /> Webhook
                  </button>
                  <a
                    href={`https://github.com/${project.repo}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-8 items-center gap-1.5 rounded border border-transparent px-2.5 font-mono text-xs text-[#A1A19A] transition-colors hover:border-[#383730] hover:text-[#EDEDE8]"
                  >
                    <ExternalLink aria-hidden="true" size={14} /> GitHub
                  </a>
                </div>
              </article>
            ))}
          </div>
        </div>
        <p aria-live="polite" className="mt-2 min-h-4 font-mono text-xs text-[#8A8A82]">{copyMessage}</p>
      </section>

      <section id="incidents" className="mt-12 scroll-mt-20">
        <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <p className="font-mono text-xs uppercase tracking-wider text-[#8E8E86]">Live incident feed</p>
            <h2 className="mt-2 text-xl font-semibold text-[#EDEDE8]">Needs your attention</h2>
          </div>
          <span className="inline-flex items-center gap-2 font-mono text-xs text-[#F59E0B]">
            <CircleAlert aria-hidden="true" size={15} /> 3 active incidents
          </span>
        </div>
        <div className="flex flex-col gap-3">
          {incidents.map((incident) => (
            <article
              key={incident.id}
              className={`relative overflow-hidden rounded-lg border bg-[#181816] p-4 transition-colors sm:p-5 ${
                incident.status === "PENDING_APPROVAL" ? "border-[#F59E0B]/40 hover:border-[#F59E0B]/70" : "border-[#262520] hover:border-[#383730]"
              }`}
            >
              {incident.status === "PENDING_APPROVAL" && (
                <span aria-label="Pending operator approval" title="Pending operator approval" className="absolute inset-y-0 left-0 w-1 animate-pulse bg-[#F59E0B]" />
              )}
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <StatusBadge tone={incident.tone}>
                      {incident.severity === "CRITICAL" ? <CircleAlert aria-hidden="true" size={14} /> : <ArrowDownRight aria-hidden="true" size={14} />}
                      {incident.severity}
                    </StatusBadge>
                    <span className="font-mono text-sm font-semibold text-[#EDEDE8]">{incident.id}</span>
                    {incident.status === "PENDING_APPROVAL" && (
                      <span className="inline-flex items-center gap-1.5 font-mono text-xs font-semibold uppercase tracking-wider text-[#F59E0B]">
                        <span className="size-1.5 animate-pulse rounded-full bg-[#F59E0B]" /> Pending operator approval
                      </span>
                    )}
                  </div>
                  <p className="mt-2 truncate font-mono text-sm leading-relaxed text-[#D4D4CE]" title={incident.signature}>{incident.signature}</p>
                  <p className="mt-1 font-mono text-xs text-[#8E8E86]">{incident.target}</p>
                </div>
                <div className="flex flex-wrap items-center gap-x-5 gap-y-2 lg:justify-end">
                  <span className="text-sm text-[#D4D4CE]">{incident.service}</span>
                  <span className="font-mono text-xs text-[#A1A19A]">{incident.volume}</span>
                  <span className="font-mono text-xs text-[#8E8E86]">{incident.age}</span>
                  <Link
                    href={`/incidents/${incident.id}`}
                    className="inline-flex items-center gap-1 rounded bg-[#262520] px-3 py-2 font-mono text-xs text-[#EDEDE8] transition-colors hover:bg-[#F59E0B] hover:text-black"
                  >
                    Investigate <ArrowRight aria-hidden="true" size={14} />
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      {isAddProjectOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/80 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setIsAddProjectOpen(false);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-project-title"
            className="w-full max-w-md rounded-lg border border-[#2B2A24] bg-[#181816] p-6 shadow-2xl"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-mono text-xs tracking-wider text-[#8A8A82]">SERVICE REGISTRATION</p>
                <h2 id="add-project-title" className="mt-2 text-xl font-semibold text-[#EDEDE8]">Add a project</h2>
                <p className="mt-2 text-sm text-[#A1A19A]">Connect a repository to begin monitoring.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddProjectOpen(false)}
                aria-label="Close dialog"
                className="flex size-8 shrink-0 items-center justify-center rounded border border-[#383730] text-[#A1A19A] transition-colors hover:text-[#EDEDE8]"
              >
                <X aria-hidden="true" size={16} />
              </button>
            </div>

            <form className="mt-6 flex flex-col gap-4" onSubmit={submitProject}>
              <label className="flex flex-col gap-2 text-sm text-[#D4D4CE]">
                Project name
                <input required name="name" placeholder="e.g. Billing API" className="rounded border border-[#2B2A24] bg-[#121211] px-3 py-2 font-mono text-sm text-[#EDEDE8] outline-none placeholder:text-[#66665F] focus:border-[#F59E0B]" />
              </label>
              <label className="flex flex-col gap-2 text-sm text-[#D4D4CE]">
                Repository URL
                <input required name="repository" type="url" placeholder="https://github.com/org/repository" className="rounded border border-[#2B2A24] bg-[#121211] px-3 py-2 font-mono text-sm text-[#EDEDE8] outline-none placeholder:text-[#66665F] focus:border-[#F59E0B]" />
              </label>
              <label className="flex flex-col gap-2 text-sm text-[#D4D4CE]">
                Branch
                <input required name="branch" defaultValue="main" className="rounded border border-[#2B2A24] bg-[#121211] px-3 py-2 font-mono text-sm text-[#EDEDE8] outline-none focus:border-[#F59E0B]" />
              </label>
              <button
                type="submit"
                className="mt-1 inline-flex min-h-10 items-center justify-center gap-2 rounded bg-[#F59E0B] px-4 font-mono text-sm font-medium text-black transition-colors hover:bg-[#D97706]"
              >
                Connect Repository <Plus aria-hidden="true" size={16} />
              </button>
            </form>
          </section>
        </div>
      )}
    </main>
  );
}
