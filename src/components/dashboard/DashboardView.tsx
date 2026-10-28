"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { ReactNode } from "react";
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Check,
  CircleAlert,
  Clock3,
  Copy,
  GitBranch,
  Plus,
  Server,
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

function MetricCard({
  label,
  value,
  detail,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string;
  detail: ReactNode;
  icon: typeof Server;
  accent: "cyan" | "rose" | "amber";
}) {
  const accentClasses = {
    cyan: "border-cyan-400/20 bg-cyan-400/[0.08] text-cyan-200",
    rose: "border-rose-400/20 bg-rose-400/[0.08] text-rose-200",
    amber: "border-amber-400/20 bg-amber-400/[0.08] text-amber-200",
  };

  return (
    <article className="glass-card rounded-2xl p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold tracking-wide text-slate-400">{label}</p>
          <p className="mt-3 text-4xl font-extrabold tracking-tight text-white">{value}</p>
        </div>
        <span className={`flex size-12 items-center justify-center rounded-xl border ${accentClasses[accent]}`}>
          <Icon aria-hidden="true" size={22} />
        </span>
      </div>
      <p className="mt-4 text-sm text-slate-500">{detail}</p>
    </article>
  );
}

function ProjectCard({
  project,
}: {
  project: (typeof projects)[number];
}) {
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
    <article className="glass-card feature-card flex min-h-72 flex-col rounded-2xl p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <span className="flex size-12 items-center justify-center rounded-xl border border-cyan-300/20 bg-cyan-300/[0.08] text-cyan-200">
            <Server aria-hidden="true" size={22} />
          </span>
          <div>
            <h3 className="text-xl font-bold text-white">{project.name}</h3>
            <p className="mt-1 text-sm text-slate-500">Production service</p>
          </div>
        </div>
        <StatusBadge tone={project.tone}>
          <span className="size-2 rounded-full bg-current" />
          {project.health}
        </StatusBadge>
      </div>

      <a
        href={`https://github.com/${project.repo}`}
        target="_blank"
        rel="noreferrer"
        className="mt-6 inline-flex min-w-0 items-center gap-2 text-base text-slate-300 transition hover:text-cyan-200"
      >
        <GitBranch aria-hidden="true" size={17} className="shrink-0 text-cyan-300" />
        <span className="truncate">{project.repo}</span>
        <ArrowUpRight aria-hidden="true" size={16} className="shrink-0 text-slate-500" />
      </a>

      <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-white/[0.07] pt-4 text-sm text-slate-400">
        <span>Branch <span className="font-mono text-slate-200">{project.branch}</span></span>
        <span>{project.incidents} open {project.incidents === 1 ? "incident" : "incidents"}</span>
        <span>{project.latency} p95</span>
      </div>

      <div className="mt-auto pt-5">
        <button
          type="button"
          onClick={copyWebhook}
          className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-cyan-400/25 bg-cyan-400/[0.06] px-4 text-base font-semibold text-cyan-100 transition hover:border-cyan-300/60 hover:bg-cyan-400/[0.12] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300"
        >
          {copyMessage === "Webhook URL copied." ? (
            <Check aria-hidden="true" size={18} />
          ) : (
            <Copy aria-hidden="true" size={18} />
          )}
          {copyMessage === "Webhook URL copied." ? "Webhook Copied" : "Copy Ingestion Webhook"}
        </button>
        <p aria-live="polite" className="mt-2 min-h-5 text-sm text-cyan-200/80">{copyMessage}</p>
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

  return (
    <main className="mx-auto w-full max-w-[1600px] px-5 pb-24 pt-10 sm:px-8 sm:pt-14 lg:px-12">
      <header className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
        <div>
          <p className="eyebrow">INCIDENT COMMAND / WORKSPACE</p>
          <h1 className="mt-3 text-4xl font-extrabold tracking-tight text-white sm:text-5xl">War Room</h1>
          <p className="mt-3 text-lg text-slate-400">Your services, signals, and response queue at a glance.</p>
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-cyan-400/15 bg-cyan-400/[0.05] px-5 py-4">
          <span className="relative flex size-3">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-40" />
            <span className="relative inline-flex size-3 rounded-full bg-emerald-400" />
          </span>
          <span className="text-base font-semibold text-emerald-200">All systems operational</span>
        </div>
      </header>

      <section aria-label="Workspace summary" className="mt-9 grid gap-4 md:grid-cols-3">
        <MetricCard label="Active Services" value="12" detail="Across 4 connected repositories" icon={Server} accent="cyan" />
        <MetricCard label="Incidents Triaged" value="1,482" detail={<span className="inline-flex items-center gap-1"><ArrowUpRight aria-hidden="true" size={15} /> 18% from last week</span>} icon={Check} accent="cyan" />
        <MetricCard label="Awaiting Review" value="3" detail="Human approval required" icon={Clock3} accent="amber" />
      </section>

      <section className="mt-14">
        <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="eyebrow">SERVICE HEALTH</p>
            <h2 className="mt-2 text-2xl font-bold text-white sm:text-3xl">Monitored projects</h2>
          </div>
          <p className="text-base text-slate-400">{projects.length} projects connected</p>
        </div>
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {projects.map((project) => <ProjectCard key={project.name} project={project} />)}
          <button
            type="button"
            onClick={() => setIsAddProjectOpen(true)}
            className="group flex min-h-72 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-cyan-500/25 bg-cyan-500/[0.025] p-6 text-center transition hover:border-cyan-300/60 hover:bg-cyan-400/[0.06] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300"
          >
            <span className="flex size-14 items-center justify-center rounded-2xl border border-cyan-300/20 bg-cyan-300/[0.08] text-cyan-200 transition group-hover:shadow-[0_0_26px_rgba(6,182,212,0.2)]">
              <Plus aria-hidden="true" size={26} />
            </span>
            <span className="mt-5 text-xl font-bold text-white">Add New Project</span>
            <span className="mt-2 max-w-xs text-base leading-6 text-slate-400">Connect a repository to start monitoring alerts.</span>
          </button>
        </div>
      </section>

      <section className="mt-14">
        <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="eyebrow">LIVE INCIDENT FEED</p>
            <h2 className="mt-2 text-2xl font-bold text-white sm:text-3xl">Needs your attention</h2>
          </div>
          <span className="inline-flex items-center gap-2 text-base font-semibold text-cyan-200">
            <CircleAlert aria-hidden="true" size={18} /> 3 active incidents
          </span>
        </div>

        <div className="glass-card overflow-hidden rounded-2xl">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-left">
              <thead className="border-b border-white/10 bg-white/[0.025]">
                <tr className="text-sm font-semibold uppercase tracking-wider text-slate-400">
                  <th scope="col" className="px-6 py-5">Severity</th>
                  <th scope="col" className="px-6 py-5">Error signature</th>
                  <th scope="col" className="px-6 py-5">Service origin</th>
                  <th scope="col" className="px-6 py-5">Volume</th>
                  <th scope="col" className="px-6 py-5">Last seen</th>
                  <th scope="col" className="px-6 py-5"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06]">
                {incidents.map((incident) => (
                  <tr key={incident.id} className="transition hover:bg-cyan-400/[0.025]">
                    <td className="px-6 py-5">
                      <StatusBadge tone={incident.tone}>
                        {incident.severity === "CRITICAL" ? (
                          <CircleAlert aria-hidden="true" size={14} />
                        ) : (
                          <ArrowDownRight aria-hidden="true" size={14} />
                        )}
                        {incident.severity}
                      </StatusBadge>
                    </td>
                    <td className="max-w-[360px] px-6 py-5">
                      <p className="truncate font-mono text-sm text-slate-200" title={incident.signature}>{incident.signature}</p>
                      <p className="mt-1 text-sm text-slate-500">{incident.id}</p>
                    </td>
                    <td className="px-6 py-5 text-base text-slate-300">{incident.service}</td>
                    <td className="px-6 py-5 font-mono text-base text-slate-300">{incident.volume}</td>
                    <td className="px-6 py-5 text-base text-slate-400">{incident.age}</td>
                    <td className="px-6 py-5">
                      <Link
                        href={`/incidents/${incident.id}`}
                        className="inline-flex h-11 items-center gap-2 rounded-xl border border-cyan-400/35 bg-cyan-400/10 px-4 text-base font-bold text-cyan-100 shadow-[0_0_18px_rgba(6,182,212,0.08)] transition hover:border-cyan-300/70 hover:bg-cyan-400/15"
                      >
                        Investigate <ArrowRight aria-hidden="true" size={17} />
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
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-[#02040a]/80 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setIsAddProjectOpen(false);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-project-title"
            className="glass-card w-full max-w-xl rounded-2xl p-6 sm:p-8"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="eyebrow">SERVICE REGISTRATION</p>
                <h2 id="add-project-title" className="mt-2 text-2xl font-bold text-white">Add a project</h2>
                <p className="mt-2 text-base text-slate-400">Connect a repository to begin monitoring.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddProjectOpen(false)}
                aria-label="Close dialog"
                className="flex size-11 shrink-0 items-center justify-center rounded-lg border border-white/10 text-slate-300 transition hover:border-white/25 hover:text-white"
              >
                <X aria-hidden="true" size={20} />
              </button>
            </div>

            <form className="mt-7 flex flex-col gap-5" onSubmit={(event) => event.preventDefault()}>
              <label className="flex flex-col gap-2 text-base font-semibold text-slate-200">
                Project name
                <input required name="name" placeholder="e.g. Billing API" className="h-12 rounded-xl border border-white/10 bg-[#080e1a] px-4 text-base text-white outline-none placeholder:text-slate-600 focus:border-cyan-400/60" />
              </label>
              <label className="flex flex-col gap-2 text-base font-semibold text-slate-200">
                Repository URL
                <input required name="repository" type="url" placeholder="https://github.com/org/repository" className="h-12 rounded-xl border border-white/10 bg-[#080e1a] px-4 text-base text-white outline-none placeholder:text-slate-600 focus:border-cyan-400/60" />
              </label>
              <label className="flex flex-col gap-2 text-base font-semibold text-slate-200">
                Branch
                <input required name="branch" defaultValue="main" className="h-12 rounded-xl border border-white/10 bg-[#080e1a] px-4 text-base text-white outline-none focus:border-cyan-400/60" />
              </label>
              <button
                type="submit"
                disabled
                title="Project creation is not connected in this preview."
                className="mt-2 inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-cyan-500/20 px-5 text-base font-bold text-cyan-100 opacity-60"
              >
                Create project <Plus aria-hidden="true" size={18} />
              </button>
              <p className="text-center text-sm text-slate-500">Project registration will be available in a future phase.</p>
            </form>
          </section>
        </div>
      )}
    </main>
  );
}
