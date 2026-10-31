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
import {
  createProject,
  getProjectWebhookUrl,
} from "@/src/app/dashboard/actions";
import type { DashboardProject } from "@/src/app/dashboard/actions";

type ProjectRow = DashboardProject & {
  health: string;
  tone: "healthy" | "muted";
  incidents: number;
  latency: string;
  uptime: string;
};

function toProjectRow(project: DashboardProject): ProjectRow {
  return {
    ...project,
    health: "Awaiting telemetry",
    tone: "muted",
    incidents: 0,
    latency: "—",
    uptime: "—",
  };
}

const incidents = [
  {
    id: "INC-4829",
    severity: "CRITICAL",
    signature: "TypeError: Cannot read properties of undefined (reading 'currency')",
    service: "Payment Gateway",
    volume: "1,284 events",
    age: "4 min ago",
    tone: "critical" as const,
    status: "PENDING_OPERATOR_APPROVAL",
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
    status: "PENDING_OPERATOR_APPROVAL",
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

async function copyText(value: string) {
  if (!navigator.clipboard) throw new Error("Clipboard access is unavailable in this browser.");
  await navigator.clipboard.writeText(value);
}

type DeploymentProvider = "NONE" | "VERCEL" | "RENDER" | "CUSTOM";

const fieldClassName =
  "w-full rounded border border-[#2B2A24] bg-[#121211] px-3 py-2 font-mono text-sm text-[#EDEDE8] outline-none placeholder:text-[#66665F] focus:border-[#2B2A24] focus:ring-0 focus-visible:outline-none";

function FormField({
  label,
  name,
  placeholder,
  type = "text",
  required = false,
  defaultValue,
  helper,
}: {
  label: string;
  name: string;
  placeholder?: string;
  type?: string;
  required?: boolean;
  defaultValue?: string;
  helper?: string;
}) {
  return (
    <label className="flex flex-col gap-1.5 text-sm text-[#D4D4CE]">
      {label}
      <input
        className={fieldClassName}
        name={name}
        type={type}
        placeholder={placeholder}
        required={required}
        defaultValue={defaultValue}
        autoComplete={type === "password" ? "new-password" : undefined}
      />
      {helper && <span className="text-xs leading-relaxed text-[#8E8E86]">{helper}</span>}
    </label>
  );
}

export default function DashboardView({ initialProjects }: { initialProjects: DashboardProject[] }) {
  const [projects, setProjects] = useState(initialProjects.map(toProjectRow));
  const [isAddProjectOpen, setIsAddProjectOpen] = useState(false);
  const [copyMessage, setCopyMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [deploymentProvider, setDeploymentProvider] = useState<DeploymentProvider>("NONE");
  const [createdProject, setCreatedProject] = useState<{ name: string; webhookUrl: string } | null>(null);

  useEffect(() => {
    if (!isAddProjectOpen) return;

    const previousBodyOverflow = document.body.style.overflow;
    const previousDocumentOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousDocumentOverflow;
    };
  }, [isAddProjectOpen]);

  async function submitProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");
    setIsSubmitting(true);

    try {
      const result = await createProject(new FormData(event.currentTarget));
      if (!result.success) {
        setFormError(result.error);
        return;
      }

      setProjects((current) => [toProjectRow(result.project), ...current]);
      setCreatedProject({
        name: result.project.name,
        webhookUrl: new URL(result.webhookUrl, window.location.origin).toString(),
      });
    } catch (error) {
      console.error("Project registration request failed.", error);
      setFormError("Project registration failed unexpectedly. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleCopyWebhook(project: ProjectRow) {
    try {
      const webhookUrl = await getProjectWebhookUrl(project.id);
      await copyText(new URL(webhookUrl, window.location.origin).toString());
      setCopyMessage(`${project.name} webhook URL copied.`);
    } catch (error) {
      console.error("Unable to copy the ingestion webhook URL.", error);
      setCopyMessage(error instanceof Error ? error.message : "Could not copy webhook URL.");
    }
  }

  function closeProjectDialog() {
    if (!window.confirm("Close this project setup? Any unsaved changes will be lost.")) return;

    setIsAddProjectOpen(false);
    setFormError("");
    setCreatedProject(null);
    setDeploymentProvider("NONE");
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
          label="Registered Services"
          value={String(projects.length)}
          detail={`${projects.length} connected to this workspace`}
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
            <span>Service / Uptime</span><span>Health</span><span>Branch</span><span>P95 Latency</span><span>Open Incidents</span><span>Actions</span>
          </div>
          <div className="divide-y divide-[#262520]">
            {projects.length === 0 && (
              <div className="px-5 py-10 text-center">
                <p className="text-sm text-[#D4D4CE]">No services registered yet.</p>
                <p className="mt-1 text-sm leading-relaxed text-[#8E8E86]">Connect a GitHub repository to generate its incident-ingestion webhook.</p>
              </div>
            )}
            {projects.map((project) => (
              <article
                key={project.id}
                className="grid gap-4 px-4 py-4 transition-colors hover:bg-[#1D1D19] sm:px-5 xl:grid-cols-[minmax(190px,1.3fr)_minmax(150px,1fr)_repeat(3,minmax(100px,.65fr))_minmax(190px,1fr)] xl:items-center"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-semibold text-[#EDEDE8]">{project.name}</h3>
                    <span className="rounded border border-[#2B2A24] bg-[#1E1E1B] px-2 py-0.5 font-mono text-xs text-[#8E8E86]">
                      {project.uptime}
                    </span>
                  </div>
                  <p className="mt-1 truncate font-mono text-xs leading-relaxed text-[#8E8E86]">{project.repoOwner}/{project.repoName}</p>
                  {project.deployedUrl && (
                    <a
                      href={project.deployedUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 inline-flex items-center gap-1 font-mono text-xs text-[#8E8E86] transition-colors hover:text-[#EDEDE8]"
                    >
                      Application <ExternalLink aria-hidden="true" size={12} />
                    </a>
                  )}
                </div>
                <div>
                  <p className="mb-1 font-mono text-xs uppercase tracking-wider text-[#8E8E86] xl:hidden">Health</p>
                  <span className={`inline-flex items-center gap-2 text-sm font-medium ${project.tone === "muted" ? "text-[#A1A19A]" : "text-emerald-400"}`}>
                    <span className={`size-2 rounded-full ${project.tone === "muted" ? "bg-[#77766F]" : "bg-emerald-400"}`} />
                    {project.health}
                  </span>
                </div>
                <div>
                  <p className="mb-1 font-mono text-xs uppercase tracking-wider text-[#8E8E86] xl:hidden">Active branch</p>
                  <span className="font-mono text-sm text-[#D4D4CE]">{project.defaultBranch}</span>
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
                    href={`https://github.com/${project.repoOwner}/${project.repoName}`}
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
                incident.status === "PENDING_OPERATOR_APPROVAL" ? "border-amber-500/40 hover:border-amber-500/70" : "border-[#232320] hover:border-[#383730]"
              }`}
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-start gap-2.5">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <StatusBadge tone={incident.tone}>
                        {incident.severity === "CRITICAL" ? <CircleAlert aria-hidden="true" size={14} /> : <ArrowDownRight aria-hidden="true" size={14} />}
                        {incident.severity}
                      </StatusBadge>
                      <span className="font-mono text-sm font-semibold text-[#EDEDE8]">{incident.id}</span>
                    </div>
                    {incident.status === "PENDING_OPERATOR_APPROVAL" && (
                      <span className="inline-flex items-center gap-1.5 rounded border border-amber-500/40 bg-amber-500/10 px-2.5 py-1 font-mono text-xs font-medium text-amber-400">
                        Action Required: Awaiting Your Review
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
                    className={`inline-flex items-center gap-1 rounded px-3 py-2 font-mono text-xs transition-colors ${
                      incident.status === "PENDING_OPERATOR_APPROVAL"
                        ? "bg-[#F59E0B] font-semibold text-black hover:bg-[#D97706]"
                        : "bg-[#1E1E1B] text-[#D4D4CE] hover:bg-[#282723]"
                    }`}
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
          className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden overscroll-contain bg-black/80 p-4 backdrop-blur-sm"
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-project-title"
            className="hide-scrollbar max-h-[calc(100dvh-2rem)] w-full max-w-2xl overflow-y-auto overscroll-contain rounded-lg border border-[#2B2A24] bg-[#181816] p-6 shadow-2xl"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-mono text-xs tracking-wider text-[#8A8A82]">SERVICE REGISTRATION</p>
                <h2 id="add-project-title" className="mt-2 text-xl font-semibold text-[#EDEDE8]">
                  {createdProject ? "Webhook setup" : "Add a project"}
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-[#A1A19A]">
                  {createdProject
                    ? `${createdProject.name} is registered. Add this endpoint to your alert source.`
                    : "Connect a GitHub repository and configure optional runtime remediation."}
                </p>
              </div>
              <button
                type="button"
                onClick={closeProjectDialog}
                disabled={isSubmitting}
                aria-label="Close dialog"
                className="flex size-8 shrink-0 items-center justify-center rounded border border-[#383730] text-[#A1A19A] transition-colors hover:text-[#EDEDE8]"
              >
                <X aria-hidden="true" size={16} />
              </button>
            </div>

            {createdProject ? (
              <div className="mt-6 flex flex-col gap-4">
                <div>
                  <p className="font-mono text-xs uppercase tracking-wider text-[#8E8E86]">Generated ingestion webhook</p>
                  <code className="mt-2 block break-all rounded border border-[#2B2A24] bg-[#121211] p-3 font-mono text-sm leading-relaxed text-[#D4D4CE]">
                    {createdProject.webhookUrl}
                  </code>
                  <p className="mt-2 text-xs leading-relaxed text-[#8E8E86]">
                    This URL contains the project API key. Keep it private and rotate it if it is exposed.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await copyText(createdProject.webhookUrl);
                      setCopyMessage("Webhook URL copied.");
                    } catch (error) {
                      console.error("Unable to copy the new project webhook URL.", error);
                      setCopyMessage(error instanceof Error ? error.message : "Could not copy webhook URL.");
                    }
                  }}
                  className="inline-flex min-h-10 items-center justify-center gap-2 rounded bg-[#F59E0B] px-4 font-mono text-sm font-medium text-black transition-colors hover:bg-[#D97706]"
                >
                  <Copy aria-hidden="true" size={16} /> Copy Webhook URL
                </button>
                <p aria-live="polite" className="min-h-4 font-mono text-xs text-[#8E8E86]">{copyMessage}</p>
                <p className="text-xs leading-relaxed text-[#8E8E86]">
                  Send a JSON POST with <code className="text-[#D4D4CE]">serviceName</code>, <code className="text-[#D4D4CE]">message</code>, and <code className="text-[#D4D4CE]">stackTrace</code>.
                </p>
              </div>
            ) : (
              <form className="mt-6 flex flex-col gap-5" onSubmit={submitProject}>
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField label="Project name" name="name" placeholder="e.g. Storefront API" required />
                  <FormField label="Repository owner" name="repoOwner" placeholder="e.g. acme-corp" required />
                  <FormField label="Repository name" name="repoName" placeholder="e.g. backend-api" required />
                  <FormField
                    label="GitHub personal access token"
                    name="githubToken"
                    type="password"
                    placeholder="Fine-grained GitHub token"
                    required
                    helper="Requires Contents: Read & Write and Pull Requests: Read & Write."
                  />
                </div>

                <div className="grid gap-4 border-t border-[#2B2A24] pt-4 sm:grid-cols-2">
                  <FormField label="Default branch (optional)" name="defaultBranch" defaultValue="main" />
                  <FormField label="Deployed URL (optional)" name="deployedUrl" type="url" placeholder="https://api.yourdomain.com" />
                </div>

                <div className="flex flex-col gap-4 border-t border-[#2B2A24] pt-4">
                  <label className="flex flex-col gap-1.5 text-sm text-[#D4D4CE]">
                    Runtime configuration provider (optional)
                    <select
                      name="deploymentProvider"
                      value={deploymentProvider}
                      onChange={(event) => setDeploymentProvider(event.target.value as DeploymentProvider)}
                      className={fieldClassName}
                    >
                      <option value="NONE">None</option>
                      <option value="VERCEL">Vercel</option>
                      <option value="RENDER">Render</option>
                      <option value="CUSTOM">Custom webhook</option>
                    </select>
                  </label>

                  {deploymentProvider === "NONE" && (
                    <p className="rounded border border-[#2B2A24] bg-[#121211] px-3 py-2 text-sm leading-relaxed text-[#A1A19A]">
                      Healix will handle automated code fixes and revert PRs on GitHub. Automated runtime configuration patching will be skipped.
                    </p>
                  )}

                  {deploymentProvider === "VERCEL" && (
                    <div className="grid gap-4 sm:grid-cols-2">
                      <FormField label="Vercel Project ID" name="platformServiceId" placeholder="prj_xxxxxxxxxxxxxxxxxxxx" required helper="Found in Vercel Project Settings → General." />
                      <FormField label="Vercel Access Token" name="platformApiToken" type="password" placeholder="Vercel personal access token" required helper="Generated under Vercel Account Settings → Tokens." />
                      <FormField label="Vercel Team ID (optional)" name="platformTeamId" placeholder="team_xxxxxxxxxxxxxxxxxxxx" helper="Leave blank for a personal account." />
                    </div>
                  )}

                  {deploymentProvider === "RENDER" && (
                    <div className="grid gap-4 sm:grid-cols-2">
                      <FormField label="Render Service ID" name="platformServiceId" placeholder="srv-xxxxxxxxxxxxxxxxxxxx" required helper="Found in the URL of your Render service dashboard." />
                      <FormField label="Render API Key" name="platformApiToken" type="password" placeholder="Render API key" required helper="Generated under Render Account Settings → API Keys." />
                    </div>
                  )}

                  {deploymentProvider === "CUSTOM" && (
                    <>
                      <p className="rounded border border-[#2B2A24] bg-[#121211] px-3 py-2 text-sm leading-relaxed text-[#A1A19A]">
                        Healix will send signed requests to this endpoint when approved runtime configuration patches are needed.
                      </p>
                      <FormField
                        label="Custom webhook URL"
                        name="customWebhookUrl"
                        type="url"
                        placeholder="https://infra.yourcompany.com/api/healix-patch"
                        required
                        helper="Requests include configKey and configValue and use an HMAC-SHA256 signature."
                      />
                    </>
                  )}
                </div>

                {formError && (
                  <p role="alert" className="rounded border border-rose-800/40 bg-rose-950/20 px-3 py-2 text-sm text-rose-200">
                    {formError}
                  </p>
                )}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="mt-1 inline-flex min-h-10 items-center justify-center gap-2 rounded bg-[#F59E0B] px-4 font-mono text-sm font-medium text-black transition-colors hover:bg-[#D97706] disabled:cursor-wait disabled:opacity-70"
                >
                  {isSubmitting ? "Registering project..." : "Connect Repository"}
                  {!isSubmitting && <Plus aria-hidden="true" size={16} />}
                </button>
              </form>
            )}
          </section>
        </div>
      )}
    </main>
  );
}
