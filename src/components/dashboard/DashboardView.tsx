"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { FormEvent, ReactNode } from "react";
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Check,
  CircleAlert,
  Copy,
  GitBranch,
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
  },
  {
    id: "INC-4812",
    severity: "HIGH",
    signature: "PrismaClientKnownRequestError: Unique constraint failed",
    service: "Orders API",
    volume: "342 events",
    age: "18 min ago",
    tone: "high" as const,
  },
  {
    id: "INC-4786",
    severity: "HIGH",
    signature: "ETIMEDOUT: upstream identity provider",
    service: "Auth Microservice",
    volume: "86 events",
    age: "42 min ago",
    tone: "high" as const,
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
      <p className="font-mono text-[11px] uppercase tracking-wider text-[#8A8A82]">{label}</p>
      <p className={`mt-2 font-mono text-2xl ${highlight ? "text-[#F59E0B]" : "text-[#EDEDE8]"}`}>{value}</p>
      <p className="mt-1 text-xs text-[#8A8A82]">{detail}</p>
    </div>
  );
}

function ProjectCard({ project }: { project: (typeof projects)[number] }) {
  const [copyMessage, setCopyMessage] = useState("");

  async function copyWebhook() {
    const url = `${window.location.origin}/api/webhooks/alerts?service=${encodeURIComponent(project.webhook)}`;
    if (!navigator.clipboard) {
      setCopyMessage("Clipboard access is unavailable in this browser.");
      return;
    }

    try {
      await navigator.clipboard.writeText(url);
      setCopyMessage("Webhook URL copied.");
    } catch (error) {
      console.error("Unable to copy the ingestion webhook URL.", error);
      setCopyMessage("Could not copy the URL. Check clipboard permissions and try again.");
    }
  }

  return (
    <article className="flex min-h-64 flex-col rounded-lg border border-[#262520] bg-[#181816] p-5 transition-colors hover:border-[#383730]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-base font-semibold text-[#EDEDE8]">{project.name}</h3>
          <a
            href={`https://github.com/${project.repo}`}
            target="_blank"
            rel="noreferrer"
            className="mt-2 inline-flex max-w-full items-center gap-2 font-mono text-xs text-[#A1A19A] transition-colors hover:text-[#EDEDE8]"
          >
            <GitBranch aria-hidden="true" size={14} className="shrink-0" />
            <span className="truncate">{project.repo}</span>
            <ArrowUpRight aria-hidden="true" size={13} className="shrink-0" />
          </a>
        </div>
        <StatusBadge tone={project.tone}>
          <span className="size-1.5 rounded-full bg-current" />
          {project.health}
        </StatusBadge>
      </div>

      <div className="mt-5 grid grid-cols-3 gap-2 border-t border-[#2B2A24] pt-4 text-xs text-[#8A8A82]">
        <p>Branch <span className="mt-1 block truncate font-mono text-[#D4D4CE]">{project.branch}</span></p>
        <p>Incidents <span className="mt-1 block font-mono text-[#D4D4CE]">{project.incidents} open</span></p>
        <p>Latency <span className="mt-1 block font-mono text-[#D4D4CE]">{project.latency}</span></p>
      </div>

      <div className="mt-auto flex flex-wrap items-center gap-2 pt-5">
        <button
          type="button"
          onClick={copyWebhook}
          className="inline-flex min-h-8 items-center gap-2 rounded border border-[#383730] bg-[#121211] px-2.5 font-mono text-[11px] text-[#A1A19A] transition-colors hover:border-[#F59E0B]/50 hover:text-[#EDEDE8]"
        >
          {copyMessage === "Webhook URL copied." ? <Check aria-hidden="true" size={13} /> : <Copy aria-hidden="true" size={13} />}
          [ Webhook URL ]
        </button>
        <p aria-live="polite" className="sr-only">{copyMessage}</p>
      </div>
    </article>
  );
}

export default function DashboardView() {
  const [isAddProjectOpen, setIsAddProjectOpen] = useState(false);

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

  return (
    <main className="mx-auto w-full max-w-[1600px] flex-1 bg-[#121211] px-5 pb-20 pt-9 text-[#EDEDE8] sm:px-8 lg:px-12">
      <header className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <p className="font-mono text-xs uppercase tracking-wider text-[#A1A19A]">Workspace / war-room</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[#EDEDE8] sm:text-4xl">War Room</h1>
          <p className="mt-2 text-sm text-[#A1A19A]">Your services, signals, and response queue at a glance.</p>
        </div>
        <div className="inline-flex items-center gap-2 self-start rounded-md border border-[#2B2A24] bg-[#1B1B18] px-3 py-2 sm:self-auto">
          <span className="relative flex size-2">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-40" />
            <span className="relative inline-flex size-2 rounded-full bg-emerald-400" />
          </span>
          <span className="font-mono text-xs text-emerald-400">engine active</span>
        </div>
      </header>

      <section
        aria-label="Workspace telemetry"
        className="mt-8 grid grid-cols-1 divide-y divide-[#2B2A24] rounded-lg border border-[#2B2A24] bg-[#1B1B18] p-4 sm:grid-cols-3 sm:divide-x sm:divide-y-0"
      >
        <MetricCell label="Active Services" value="12" detail="All webhooks active" />
        <MetricCell label="Incidents Resolved" value="1,482" detail="Avg MTTR: 4.2m" />
        <MetricCell label="Awaiting Approval" value="3" detail="Human gate paused" highlight />
      </section>

      <section className="mt-12">
        <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-wider text-[#8A8A82]">Service health</p>
            <h2 className="mt-2 text-xl font-semibold text-[#EDEDE8]">Monitored projects</h2>
          </div>
          <p className="text-sm text-[#8A8A82]">{projects.length} projects connected</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {projects.map((project) => <ProjectCard key={project.name} project={project} />)}
          <button
            type="button"
            onClick={() => setIsAddProjectOpen(true)}
            className="flex min-h-64 flex-col items-center justify-center rounded-lg border border-dashed border-[#383730] bg-[#181816] p-5 text-center transition-colors hover:border-[#F59E0B]/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F59E0B]"
          >
            <span className="flex size-10 items-center justify-center rounded-md border border-[#383730] bg-[#121211] text-[#F59E0B]">
              <Plus aria-hidden="true" size={20} />
            </span>
            <span className="mt-4 font-medium text-[#EDEDE8]">Add Project</span>
            <span className="mt-1 text-xs text-[#8A8A82]">Connect a repository to monitor alerts.</span>
          </button>
        </div>
      </section>

      <section className="mt-12">
        <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-wider text-[#8A8A82]">Live incident feed</p>
            <h2 className="mt-2 text-xl font-semibold text-[#EDEDE8]">Needs your attention</h2>
          </div>
          <span className="inline-flex items-center gap-2 font-mono text-xs text-[#F59E0B]">
            <CircleAlert aria-hidden="true" size={15} /> 3 active incidents
          </span>
        </div>
        <div className="overflow-hidden rounded-lg border border-[#262520] bg-[#181816]">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-left">
              <thead className="border-b border-[#262520]">
                <tr className="font-mono text-[11px] uppercase tracking-wider text-[#8A8A82]">
                  <th scope="col" className="px-5 py-3">Severity</th>
                  <th scope="col" className="px-5 py-3">Error signature</th>
                  <th scope="col" className="px-5 py-3">Service origin</th>
                  <th scope="col" className="px-5 py-3">Volume</th>
                  <th scope="col" className="px-5 py-3">Last seen</th>
                  <th scope="col" className="px-5 py-3"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#262520]">
                {incidents.map((incident) => (
                  <tr key={incident.id} className="transition-colors hover:bg-[#1B1B18]">
                    <td className="px-5 py-4">
                      <StatusBadge tone={incident.tone}>
                        {incident.severity === "CRITICAL" ? <CircleAlert aria-hidden="true" size={13} /> : <ArrowDownRight aria-hidden="true" size={13} />}
                        {incident.severity}
                      </StatusBadge>
                    </td>
                    <td className="max-w-[360px] px-5 py-4">
                      <p className="truncate font-mono text-xs text-[#D4D4CE]" title={incident.signature}>{incident.signature}</p>
                      <p className="mt-1 font-mono text-[11px] text-[#77766F]">{incident.id}</p>
                    </td>
                    <td className="px-5 py-4 text-sm text-[#A1A19A]">{incident.service}</td>
                    <td className="px-5 py-4 font-mono text-xs text-[#A1A19A]">{incident.volume}</td>
                    <td className="px-5 py-4 font-mono text-xs text-[#8A8A82]">{incident.age}</td>
                    <td className="px-5 py-4">
                      <Link
                        href={`/incidents/${incident.id}`}
                        className="inline-flex items-center gap-1 rounded bg-[#262520] px-3 py-1.5 font-mono text-xs text-[#EDEDE8] transition-colors hover:bg-[#F59E0B] hover:text-black"
                      >
                        Investigate <ArrowRight aria-hidden="true" size={13} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
                <p className="font-mono text-[11px] tracking-wider text-[#8A8A82]">SERVICE REGISTRATION</p>
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
