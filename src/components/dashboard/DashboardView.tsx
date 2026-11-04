"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { FormEvent, ReactNode } from "react";
import {
  Activity,
  ArrowRight,
  Ban,
  CheckCircle2,
  Clock3,
  CircleAlert,
  Copy,
  ExternalLink,
  LoaderCircle,
  MoreVertical,
  Pencil,
  Plus,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import StatusBadge from "@/src/components/ui/StatusBadge";
import type { DashboardIncident } from "@/src/components/incidents/incident-data";
import { formatDateTimeIST } from "@/src/lib/date-time";
import {
  createProject,
  deleteProject,
  getProjectWebhookUrl,
  updateProject,
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

type DashboardViewMode = "overview" | "projects" | "incidents";
type IncidentFilter = "investigating" | "approval" | "solved" | "dismissed";

const incidentFilterOptions: { id: IncidentFilter; label: string }[] = [
  { id: "investigating", label: "Investigating" },
  { id: "approval", label: "Action required" },
  { id: "solved", label: "Solved" },
  { id: "dismissed", label: "Dismissed" },
];

function githubErrorMessage(error?: string): string {
  const messages: Record<string, string> = {
    install_unavailable: "GitHub App installation could not be started. Check the app configuration and try again.",
    installation_not_completed: "GitHub App installation was not completed.",
    no_repositories: "No repositories were granted to the GitHub App installation.",
    repository_lookup_failed: "Healix could not load repositories from that GitHub App installation.",
    installation_expired: "The GitHub App connection expired. Please connect the repository again.",
  };
  return error ? messages[error] ?? "GitHub repository connection failed. Please try again." : "";
}

function incidentFilterCount(incidents: DashboardIncident[], filter: IncidentFilter): number {
  return incidents.filter((incident) => matchesIncidentFilter(incident, filter)).length;
}

function matchesIncidentFilter(incident: DashboardIncident, filter: IncidentFilter): boolean {
  switch (filter) {
    case "investigating":
      return incident.status === "MITIGATING" ||
        (incident.status === "INVESTIGATING" && incident.proposedAction === null);
    case "approval":
      return incident.status !== "RESOLVED" &&
        incident.status !== "DISMISSED" &&
        ((incident.status === "PENDING_APPROVAL" && incident.proposedAction !== "NO_ACTION") ||
          incident.proposedAction === "MANUAL_INTERVENTION");
    case "solved":
      return incident.status === "RESOLVED" ||
        (incident.status !== "DISMISSED" && incident.proposedAction === "NO_ACTION");
    case "dismissed":
      return incident.status === "DISMISSED";
  }
}

function formatTimeAgo(value: string): string {
  const timestamp = new Date(value).getTime();
  if (Number.isNaN(timestamp)) return "Time unavailable";

  const elapsedSeconds = Math.max(0, (Date.now() - timestamp) / 1000);
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ["year", 31_536_000],
    ["month", 2_592_000],
    ["week", 604_800],
    ["day", 86_400],
    ["hour", 3_600],
    ["minute", 60],
  ];
  const formatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  const unit = units.find(([, seconds]) => elapsedSeconds >= seconds);
  if (!unit) return "just now";
  return formatter.format(-Math.floor(elapsedSeconds / unit[1]), unit[0]);
}

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
      <div className="mt-1 text-base leading-relaxed text-[#D4D4CE]">{detail}</div>
    </div>
  );
}

async function copyText(value: string) {
  if (!navigator.clipboard) throw new Error("Clipboard access is unavailable in this browser.");
  await navigator.clipboard.writeText(value);
}

function incidentOutcome(incident: DashboardIncident) {
  if (incident.status === "RESOLVED") {
    return {
      label: "Solved",
      detail: incident.reviewedBy ? `Approved by ${incident.reviewedBy}` : "Remediation completed",
      tone: "healthy" as const,
      icon: <CheckCircle2 aria-hidden="true" size={14} />,
    };
  }

  if (incident.status === "DISMISSED") {
    return {
      label: "Dismissed",
      detail: incident.humanApprovalStatus === "REJECTED"
        ? `Rejected by ${incident.reviewedBy ?? "operator"}`
        : "Remediation dismissed",
      tone: "muted" as const,
      icon: <Ban aria-hidden="true" size={14} />,
    };
  }

  if (incident.proposedAction === "NO_ACTION") {
    return {
      label: "No action needed",
      detail: "Automated triage recommends no change",
      tone: "muted" as const,
      icon: <CheckCircle2 aria-hidden="true" size={14} />,
    };
  }

  if (incident.proposedAction === "MANUAL_INTERVENTION") {
    return {
      label: "Action Required",
      detail: "Manual follow-up is needed",
      tone: "high" as const,
      icon: <CircleAlert aria-hidden="true" size={14} />,
    };
  }

  if (incident.humanApprovalStatus === "APPROVED") {
    return {
      label: "Approved",
      detail: incident.reviewedBy ? `By ${incident.reviewedBy} · remediation in progress` : "Remediation in progress",
      tone: "healthy" as const,
      icon: <CheckCircle2 aria-hidden="true" size={14} />,
    };
  }

  if (incident.status === "PENDING_APPROVAL") {
    return {
      label: "Awaiting review",
      detail: "Action requires your approval",
      tone: "high" as const,
      icon: <CircleAlert aria-hidden="true" size={14} />,
    };
  }

  return {
    label: "Investigating",
    detail: "Automated triage in progress",
    tone: "muted" as const,
    icon: <CircleAlert aria-hidden="true" size={14} />,
  };
}

type DeploymentProvider = "NONE" | "VERCEL" | "RENDER" | "CUSTOM";
type ConnectedRepository = {
  installationId: string;
  owner: string;
  repo: string;
  branch: string;
};

const fieldClassName =
  "w-full rounded border border-[#2B2A24] bg-[#121211] px-3 py-2 font-mono text-sm text-[#EDEDE8] outline-none placeholder:text-[#66665F] focus:border-[#F59E0B] focus:ring-0 focus-visible:!outline-none focus-visible:!outline-offset-0";

function FormField({
  label,
  name,
  placeholder,
  type = "text",
  required = false,
  defaultValue,
  helper,
  readOnly = false,
}: {
  label: string;
  name: string;
  placeholder?: string;
  type?: string;
  required?: boolean;
  defaultValue?: string;
  helper?: string;
  readOnly?: boolean;
}) {
  return (
    <label className="flex flex-col gap-1.5 text-sm text-[#D4D4CE]">
      {label}
      <input
        className={`${fieldClassName} ${readOnly ? "text-[#8E8E86] opacity-80 cursor-not-allowed" : ""}`}
        name={name}
        type={type}
        placeholder={placeholder}
        required={required}
        defaultValue={defaultValue}
        readOnly={readOnly}
        autoComplete={type === "password" ? "new-password" : undefined}
      />
      {helper && <span className="text-xs leading-relaxed text-[#8E8E86]">{helper}</span>}
    </label>
  );
}

export default function DashboardView({
  view,
  initialProjects,
  initialIncidents,
  resolvedIncidents,
  pendingApprovals,
  activeIncidents,
  githubInstallationIds = [],
  initialGitHubError,
}: {
  view: DashboardViewMode;
  initialProjects: DashboardProject[];
  initialIncidents: DashboardIncident[];
  resolvedIncidents: number;
  pendingApprovals: number;
  activeIncidents: number;
  githubInstallationIds?: string[];
  initialGitHubError?: string;
}) {
  const [projects, setProjects] = useState(initialProjects.map(toProjectRow));
  const [isAddProjectOpen, setIsAddProjectOpen] = useState(Boolean(initialGitHubError));
  const [editingProject, setEditingProject] = useState<ProjectRow | null>(null);
  const [isUpdatingProject, setIsUpdatingProject] = useState(false);
  const [projectError, setProjectError] = useState("");
  const [projectActionMessage, setProjectActionMessage] = useState("");
  const [isDeletingProject, setIsDeletingProject] = useState<string | null>(null);
  const [autoPrProjectId, setAutoPrProjectId] = useState<string | null>(null);
  const [autoPrError, setAutoPrError] = useState("");
  const [visibleIncidents, setVisibleIncidents] = useState(initialIncidents);
  const [selectedIncidentFilters, setSelectedIncidentFilters] = useState<IncidentFilter[]>([]);
  const [deletingIncidentId, setDeletingIncidentId] = useState<string | null>(null);
  const [incidentDeleteError, setIncidentDeleteError] = useState("");
  const [copyMessage, setCopyMessage] = useState("");
  const copyMessageTimeout = useRef<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState(() => githubErrorMessage(initialGitHubError));
  const [deploymentProvider, setDeploymentProvider] = useState<DeploymentProvider>("NONE");
  const [editingDeploymentProvider, setEditingDeploymentProvider] = useState<DeploymentProvider>("NONE");
  const [createdProject, setCreatedProject] = useState<{
    id: string;
    name: string;
    webhookUrl: string;
    prUrl: string | null;
  } | null>(null);
  const [connectedRepository, setConnectedRepository] = useState<ConnectedRepository | null>(null);

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

  useEffect(() => () => {
    if (copyMessageTimeout.current !== null) {
      window.clearTimeout(copyMessageTimeout.current);
    }
  }, []);

  function showCopyMessage(message: string) {
    setCopyMessage(message);
    if (copyMessageTimeout.current !== null) {
      window.clearTimeout(copyMessageTimeout.current);
    }
    copyMessageTimeout.current = window.setTimeout(() => {
      setCopyMessage("");
      copyMessageTimeout.current = null;
    }, 2500);
  }

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
        id: result.project.id,
        name: result.project.name,
        webhookUrl: new URL(result.webhookUrl, window.location.origin).toString(),
        prUrl: result.project.errorTrackingPrUrl,
      });
      window.history.replaceState(null, "", window.location.pathname);
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
      showCopyMessage(`${project.name} webhook URL copied.`);
    } catch (error) {
      console.error("Unable to copy the ingestion webhook URL.", error);
      setCopyMessage(error instanceof Error ? error.message : "Could not copy webhook URL.");
    }
  }

  async function handleAutoPr(project: Pick<ProjectRow, "id" | "name">) {
    if (autoPrProjectId) return;
    setAutoPrProjectId(project.id);
    setAutoPrError("");
    setProjectActionMessage("");
    try {
      const response = await fetch(`/api/projects/${encodeURIComponent(project.id)}/auto-instrument`, {
        method: "POST",
      });
      const result = await response.json() as { success?: boolean; prUrl?: string; error?: string };
      if (!response.ok || !result.success || !result.prUrl) {
        throw new Error(result.error ?? "Could not create the pull request. Try again.");
      }

      setProjects((current) =>
        current.map((item) =>
          item.id === project.id
            ? { ...item, errorTrackingPrUrl: result.prUrl ?? null, errorTrackingPrStatus: "OPEN" }
            : item,
        ),
      );
      setCreatedProject((current) =>
        current?.id === project.id ? { ...current, prUrl: result.prUrl ?? null } : current,
      );
      setProjectActionMessage(`${project.name} error-tracking pull request is ready.`);
    } catch (error) {
      console.error("Automatic error-tracking setup failed.", error);
      setAutoPrError(error instanceof Error ? error.message : "Could not create the pull request. Try again.");
    } finally {
      setAutoPrProjectId(null);
    }
  }

  function closeProjectDialog() {
    if (!createdProject && !window.confirm("Close this project setup? Any unsaved changes will be lost.")) return;

    setIsAddProjectOpen(false);
    setFormError("");
    setCreatedProject(null);
    setDeploymentProvider("NONE");
    window.history.replaceState(null, "", window.location.pathname);
  }

  async function submitProjectEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingProject) return;
    setProjectError("");
    setIsUpdatingProject(true);

    try {
      const result = await updateProject(editingProject.id, new FormData(event.currentTarget));
      if (!result.success) {
        setProjectError(result.error);
        return;
      }

      setProjects((current) =>
        current.map((project) => project.id === result.project.id ? toProjectRow(result.project) : project),
      );
      setProjectActionMessage(`${result.project.name} updated.`);
      setEditingProject(null);
    } catch (error) {
      console.error("Project update request failed.", error);
      setProjectError("Project could not be updated. Please try again.");
    } finally {
      setIsUpdatingProject(false);
    }
  }

  async function handleDeleteProject(project: ProjectRow) {
    const confirmed = window.confirm(
      `Delete ${project.name}? This permanently removes the project and its associated incidents and logs.`,
    );
    if (!confirmed) return;

    setProjectError("");
    setProjectActionMessage("");
    setIsDeletingProject(project.id);
    try {
      const result = await deleteProject(project.id);
      if (!result.success) {
        setProjectError(result.error);
        return;
      }
      setProjects((current) => current.filter((item) => item.id !== project.id));
      setProjectActionMessage(`${project.name} deleted.`);
    } catch (error) {
      console.error("Project deletion request failed.", error);
      setProjectError("Project could not be deleted. Please try again.");
    } finally {
      setIsDeletingProject(null);
    }
  }

  async function handleDeleteIncident(incident: DashboardIncident) {
    const needsExtraConfirmation = incident.status !== "RESOLVED" && incident.status !== "DISMISSED";
    const warning = needsExtraConfirmation
      ? `${incident.displayId} is still ${
        incident.status === "PENDING_APPROVAL"
          ? "waiting for approval"
          : incident.proposedAction === "MANUAL_INTERVENTION"
            ? "waiting for manual follow-up"
            : incident.proposedAction === "NO_ACTION"
              ? "marked as requiring no action"
              : incident.proposedAction
                ? "awaiting remediation"
                : "being investigated"
      }. Deleting it permanently removes the incident and its report. Continue?`
      : `Permanently delete ${incident.displayId} and its report?`;
    if (!window.confirm(warning)) return;

    setIncidentDeleteError("");
    setDeletingIncidentId(incident.id);
    try {
      const response = await fetch(`/api/incidents/${encodeURIComponent(incident.id)}`, { method: "DELETE" });
      const result = await response.json() as { success?: boolean; error?: string };
      if (!response.ok || !result.success) {
        setIncidentDeleteError(result.error ?? "Incident could not be deleted.");
        return;
      }
      setVisibleIncidents((current) => current.filter((item) => item.id !== incident.id));
    } catch (error) {
      console.error("Incident deletion request failed.", error);
      setIncidentDeleteError("Incident could not be deleted. Check your connection and try again.");
    } finally {
      setDeletingIncidentId(null);
    }
  }

  function toggleIncidentFilter(filter: IncidentFilter) {
    setSelectedIncidentFilters((current) =>
      current.includes(filter) ? current.filter((item) => item !== filter) : [...current, filter],
    );
  }

  const filteredIncidents = visibleIncidents.filter((incident) =>
    selectedIncidentFilters.length === 0 ||
    selectedIncidentFilters.some((filter) => matchesIncidentFilter(incident, filter)),
  );
  const displayedProjects = view === "overview" ? projects.slice(0, 3) : projects;
  const displayedIncidents = view === "overview" ? filteredIncidents.slice(0, 3) : filteredIncidents;

  return (
    <main className="mx-auto w-full max-w-[1600px] flex-1 bg-[#121211] px-5 pb-20 pt-9 text-[#EDEDE8] sm:px-8 lg:px-12">
      <header className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <p className="font-mono text-xs uppercase tracking-wider text-[#A1A19A]">Workspace / {view === "overview" ? "war-room" : view}</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[#EDEDE8] sm:text-4xl">
            {view === "overview" ? "War Room" : view === "projects" ? "Projects" : "Incidents"}
          </h1>
          <p className="mt-2 text-base text-[#A1A19A]">
            {view === "overview"
              ? "Your projects, signals, and response queue at a glance."
              : view === "projects"
                ? "Manage the projects connected to your workspace."
                : "Filter, review, and manage incidents across your projects."}
          </p>
        </div>
      </header>

      {view === "overview" && (
      <>
      <section
        aria-label="Workspace telemetry"
        className="mt-8 grid grid-cols-1 divide-y divide-[#2B2A24] rounded-lg border border-[#2B2A24] bg-[#1B1B18] p-4 sm:grid-cols-3 sm:divide-x sm:divide-y-0"
      >
        <MetricCell
          label="Registered Projects"
          value={String(projects.length)}
          detail={`connected to this workspace`}
        />
        <MetricCell label="Incidents Resolved" value={resolvedIncidents.toLocaleString()} detail="Resolved in your workspace" />
        <MetricCell
          label="Awaiting Operator Gate"
          value={pendingApprovals.toLocaleString()}
          detail={
            <Link href="/dashboard/incidents" className="inline-flex items-center gap-1 text-sm text-[#F59E0B] transition-colors hover:text-[#FDBA32]">
              Review incidents <ArrowRight aria-hidden="true" size={14} />
            </Link>
          }
          highlight
        />
      </section>
      </>
      )}

      {view !== "incidents" && (
      <section id="projects" className="mt-12 scroll-mt-20">
        <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <p className="font-mono text-xs uppercase tracking-wider text-[#8E8E86]">Project health / telemetry matrix</p>
            <h2 className="mt-2 text-xl font-semibold tracking-tight text-[#EDEDE8]">
              {view === "overview" ? "Monitored projects" : "Connected projects"}
            </h2>
          </div>
          <button
            type="button"
            onClick={() => {
              setConnectedRepository(null);
              setFormError("");
              setIsAddProjectOpen(true);
            }}
            className="inline-flex min-h-8 items-center gap-1.5 self-start rounded border border-[#383730] bg-[#181816] px-2.5 font-mono text-xs text-[#EDEDE8] transition-colors hover:border-[#F59E0B] sm:self-auto"
          >
            <Plus aria-hidden="true" size={13} /> Add Project
          </button>
        </div>
        <div className="rounded-lg border border-[#232320] bg-[#181816]">
          <div className="hidden grid-cols-[minmax(190px,1.3fr)_minmax(150px,1fr)_repeat(3,minmax(100px,.65fr))_minmax(220px,1fr)] items-center gap-4 border-b border-[#2B2A24] bg-[#141412] px-5 py-3 font-mono text-xs uppercase tracking-wider text-[#8E8E86] xl:grid">
            <span>Project / Uptime</span><span>Health</span><span>Branch</span><span>P95 Latency</span><span>Open Incidents</span><span className="text-center">Actions</span>
          </div>
          <div className="divide-y divide-[#262520]">
            {projects.length === 0 && (
              <div className="px-5 py-10 text-center">
                <p className="text-base text-[#D4D4CE]">No projects registered yet.</p>
                <p className="mt-1 text-base leading-relaxed text-[#8E8E86]">Connect a GitHub repository to generate its incident-ingestion webhook.</p>
              </div>
            )}
            {displayedProjects.map((project) => (
              <article
                key={project.id}
                className="grid gap-4 px-4 py-4 transition-colors hover:bg-[#1D1D19] sm:px-5 xl:grid-cols-[minmax(190px,1.3fr)_minmax(150px,1fr)_repeat(3,minmax(100px,.65fr))_minmax(220px,1fr)] xl:items-center"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base font-semibold text-[#EDEDE8]">{project.name}</h3>
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
                  <span className={`inline-flex items-center gap-2 text-base font-medium ${project.tone === "muted" ? "text-[#A1A19A]" : "text-emerald-400"}`}>
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
                <div className="flex items-center justify-end gap-2 xl:justify-center">
                  {project.errorTrackingPrUrl ? (
                    <a
                      href={project.errorTrackingPrUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Review setup pull request"
                      aria-label={`View error-tracking pull request for ${project.name}`}
                      className="inline-flex items-center justify-center rounded border border-[#2B2A24] p-2 text-emerald-400 transition-colors hover:bg-[#232320] hover:text-emerald-300"
                    >
                      <ExternalLink aria-hidden="true" size={16} />
                      <p className="sr-only">View PR</p>
                    </a>
                  ) : ["OPEN", "MERGED", "COMPLETED"].includes(project.errorTrackingPrStatus ?? "") ? null : (
                    <button
                      type="button"
                      onClick={() => void handleAutoPr(project)}
                      disabled={autoPrProjectId === project.id}
                      title={autoPrProjectId === project.id ? "Creating setup pull request..." : "Auto-setup error tracking"}
                      aria-label={`${autoPrProjectId === project.id ? "Creating" : "Generate"} error-tracking pull request for ${project.name}`}
                      aria-busy={autoPrProjectId === project.id}
                      className="inline-flex items-center justify-center rounded border border-[#2B2A24] p-2 text-[#8E8E86] transition-colors hover:bg-[#232320] hover:text-[#F59E0B] disabled:cursor-wait disabled:opacity-50"
                    >
                      {autoPrProjectId === project.id
                        ? <LoaderCircle aria-hidden="true" className="animate-spin" size={16} />
                        : <div>
                          <Sparkles aria-hidden="true" size={16} />
                          <p className="sr-only">Setup PR</p>
                          </div>}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => void handleCopyWebhook(project)}
                    title="Copy webhook URL"
                    aria-label={`Copy webhook URL for ${project.name}`}
                    className="inline-flex items-center justify-center rounded border border-[#2B2A24] p-2 text-[#8E8E86] transition-colors hover:bg-[#232320] hover:text-[#EDEDE8]"
                  >
                    <Copy aria-hidden="true" size={16} />
                  </button>
                  <a
                    href={`https://github.com/${project.repoOwner}/${project.repoName}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Open repository on GitHub"
                    aria-label={`Open ${project.repoOwner}/${project.repoName} on GitHub`}
                    className="inline-flex items-center justify-center rounded border border-[#2B2A24] p-2 text-[#8E8E86] transition-colors hover:bg-[#232320] hover:text-[#EDEDE8]"
                  >
                    <ExternalLink aria-hidden="true" size={16} />
                  </a>
                  <details className="group relative">
                    <summary
                      aria-label={`More actions for ${project.name}`}
                      title="More actions"
                      className="flex cursor-pointer list-none items-center justify-center rounded border border-[#2B2A24] p-2 text-[#8E8E86] transition-colors hover:bg-[#232320] hover:text-[#EDEDE8] [&::-webkit-details-marker]:hidden"
                    >
                      <MoreVertical aria-hidden="true" size={16} />
                    </summary>
                    <div className="absolute right-0 top-full z-20 mt-1 flex min-w-52 flex-col rounded-md border border-[#2B2A24] bg-[#181816] p-1 shadow-xl">
                      <button
                        type="button"
                        onClick={() => {
                          setProjectError("");
                          setEditingDeploymentProvider(project.deploymentProvider);
                          setEditingProject(project);
                        }}
                        className="flex items-center gap-2 rounded px-3 py-2 text-left text-xs text-[#D4D4CE] transition-colors hover:bg-[#232320] hover:text-[#EDEDE8]"
                      >
                        <Pencil aria-hidden="true" size={14} /> Edit Project
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDeleteProject(project)}
                        disabled={isDeletingProject === project.id}
                        className="flex items-center gap-2 rounded px-3 py-2 text-left text-xs text-rose-400 transition-colors hover:bg-rose-950/30 disabled:opacity-50"
                      >
                        <Trash2 aria-hidden="true" size={14} />
                        {isDeletingProject === project.id ? "Deleting…" : "Delete Project"}
                      </button>
                    </div>
                  </details>
                </div>
              </article>
            ))}
          </div>
        </div>
        {view === "overview" && projects.length > 3 && (
          <div className="mt-3 flex justify-end">
            <Link href="/projects" className="inline-flex items-center gap-1 font-mono text-xs text-[#F59E0B] transition-colors hover:text-[#FDBA32]">
              Show more projects <ArrowRight aria-hidden="true" size={14} />
            </Link>
          </div>
        )}
        <p aria-live="polite" className="mt-2 min-h-4 font-mono text-xs text-[#8A8A82]">{copyMessage}</p>
        {projectActionMessage && <p aria-live="polite" className="mt-1 font-mono text-xs text-emerald-400">{projectActionMessage}</p>}
        {projectError && <p role="alert" className="mt-2 font-mono text-xs text-rose-300">{projectError}</p>}
        {autoPrError && <p role="alert" className="mt-2 font-mono text-xs text-rose-300">{autoPrError}</p>}
      </section>
      )}

      {view !== "projects" && (
      <section id="incidents" className="mt-12 scroll-mt-20">
        <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <p className="font-mono text-xs uppercase tracking-wider text-[#8E8E86]">Live incident feed</p>
            <h2 className="mt-2 text-xl font-semibold tracking-tight text-[#EDEDE8]">
              {view === "overview" ? "Needs your attention" : "Incidents across your projects"}
            </h2>
          </div>
          <span className="inline-flex items-center gap-2 font-mono text-xs text-[#F59E0B]">
            <CircleAlert aria-hidden="true" size={15} /> {activeIncidents} active incidents
          </span>
        </div>
        {view === "incidents" && (
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-[#262520] py-3">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                aria-pressed={selectedIncidentFilters.length === 0}
                onClick={() => setSelectedIncidentFilters([])}
                className={`rounded-full border px-3 py-1.5 font-mono text-xs font-medium transition-colors ${
                  selectedIncidentFilters.length === 0
                    ? "border-[#F59E0B]/50 bg-[#F59E0B]/10 text-[#F59E0B]"
                    : "border-[#2B2A24] bg-[#181816] text-[#8E8E86] hover:bg-[#20201D] hover:text-[#EDEDE8]"
                }`}
              >
                All ({visibleIncidents.length})
              </button>
              {incidentFilterOptions.map((option) => {
                const isActive = selectedIncidentFilters.includes(option.id);
                return (
                  <button
                    key={option.id}
                    type="button"
                    aria-pressed={isActive}
                    onClick={() => toggleIncidentFilter(option.id)}
                    className={`rounded-full border px-3 py-1.5 font-mono text-xs font-medium transition-colors ${
                      isActive
                        ? "border-[#F59E0B]/50 bg-[#F59E0B]/10 text-[#F59E0B]"
                        : "border-[#2B2A24] bg-[#181816] text-[#8E8E86] hover:bg-[#20201D] hover:text-[#EDEDE8]"
                    }`}
                  >
                    {option.label} ({incidentFilterCount(visibleIncidents, option.id)})
                  </button>
                );
              })}
            </div>
            {selectedIncidentFilters.length > 0 && (
              <button
                type="button"
                onClick={() => setSelectedIncidentFilters([])}
                className="font-mono text-xs text-[#8E8E86] underline transition-colors hover:text-[#EDEDE8]"
              >
                Clear filters
              </button>
            )}
          </div>
        )}
        {incidentDeleteError && <p role="alert" className="mb-3 rounded border border-rose-900/50 bg-rose-950/20 px-3 py-2 text-sm text-rose-300">{incidentDeleteError}</p>}
        <div className="flex flex-col">
          {visibleIncidents.length === 0 && (
            <div className="rounded-lg border border-[#232320] bg-[#181816] px-5 py-8 text-center">
              <p className="font-mono text-sm text-[#D4D4CE]">No incidents recorded</p>
              <p className="mt-2 text-base text-[#8E8E86]">Alerts from your connected projects will appear here.</p>
            </div>
          )}
          {visibleIncidents.length > 0 && filteredIncidents.length === 0 && (
            <div className="rounded-lg border border-[#232320] bg-[#181816] px-5 py-8 text-center">
              <p className="font-mono text-sm text-[#D4D4CE]">No incidents match these filters</p>
              <button type="button" onClick={() => setSelectedIncidentFilters([])} className="mt-2 font-mono text-xs text-[#F59E0B] hover:text-[#FDBA32]">
                Clear filters
              </button>
            </div>
          )}
          {displayedIncidents.map((incident) => {
            const outcome = incidentOutcome(incident);
            const actionRequired = incident.status !== "RESOLVED" &&
              incident.status !== "DISMISSED" &&
              incident.proposedAction !== "NO_ACTION" &&
              (incident.status === "PENDING_APPROVAL" ||
                incident.proposedAction === "MANUAL_INTERVENTION");
            return (
              <article
                key={incident.id}
                className={`group mb-3 flex flex-col justify-between gap-4 rounded-lg border p-5 transition-all md:flex-row md:items-center ${
                  actionRequired
                    ? "border-[#F59E0B]/25 bg-[#1B1A16] hover:border-[#F59E0B]/40 hover:bg-[#1D1B15]"
                    : "border-[#262520] bg-[#181816] hover:border-[#383730] hover:bg-[#1C1C19]"
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      role="img"
                      aria-label={`${incident.severity} severity`}
                      className={`size-2 rounded-full ${
                        incident.severity === "CRITICAL" ? "bg-rose-400" : incident.severity === "HIGH" ? "bg-[#F59E0B]" : "bg-[#77766F]"
                      }`}
                    />
                    <span className="font-mono text-sm font-bold text-[#EDEDE8]">{incident.displayId}</span>
                    <span className="rounded border border-[#2B2A24] bg-[#141412] px-2 py-0.5 font-mono text-xs text-[#A1A19A]">{incident.project}</span>
                    <StatusBadge tone={outcome.tone}>
                      {outcome.icon}
                      {actionRequired ? "Action Required" : outcome.label}
                    </StatusBadge>
                  </div>
                  <p className="mt-1 truncate text-sm font-semibold tracking-tight text-[#EDEDE8] md:text-base" title={incident.signature}>
                    {incident.signature}
                  </p>
                  <p className="mt-0.5 truncate font-mono text-xs text-[#8E8E86]">{incident.target ?? "Source location unavailable"}</p>
                </div>
                <div className="flex flex-wrap items-center gap-3 md:justify-end">
                  <span className="flex items-center gap-1 text-xs font-mono text-[#8E8E86]">
                    <Activity aria-hidden="true" size={14} />
                    {incident.volume} {incident.volume === 1 ? "event" : "events"}
                  </span>
                  <time
                    dateTime={incident.createdAt}
                    title={formatDateTimeIST(incident.createdAt)}
                    className="flex items-center gap-1 text-xs font-mono text-[#8E8E86]"
                  >
                    <Clock3 aria-hidden="true" size={14} />
                    {formatTimeAgo(incident.createdAt)}
                  </time>
                  <Link
                    href={`/incidents/${incident.id}`}
                    className="flex items-center gap-1.5 rounded bg-[#242420] px-3.5 py-1.5 font-mono text-xs font-medium text-[#EDEDE8] transition-all hover:bg-[#F59E0B] hover:text-black"
                  >
                    Investigate <ArrowRight aria-hidden="true" size={14} />
                  </Link>
                  <button
                    type="button"
                    onClick={() => void handleDeleteIncident(incident)}
                    disabled={deletingIncidentId === incident.id}
                    aria-label={`Delete incident ${incident.displayId}`}
                    title={`Delete ${incident.displayId}`}
                    className="inline-flex size-8 items-center justify-center rounded text-[#6E6E68] opacity-100 transition-opacity hover:text-rose-400 disabled:opacity-50 md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100"
                  >
                    <Trash2 aria-hidden="true" size={16} />
                  </button>
                </div>
              </article>
            );
          })}
        </div>
        {view === "overview" && visibleIncidents.length > 3 && (
          <div className="mt-3 flex justify-end">
            <Link href="/incidents" className="inline-flex items-center gap-1 font-mono text-xs text-[#F59E0B] transition-colors hover:text-[#FDBA32]">
              Show more incidents <ArrowRight aria-hidden="true" size={14} />
            </Link>
          </div>
        )}
      </section>
      )}

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
                  {createdProject ? "Webhook setup" : "Add New Project"}
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-[#A1A19A]">
                  {createdProject
                    ? `${createdProject.name} is registered. Add this endpoint to your alert source.`
                    : "Choose an existing GitHub App installation or connect a repository to enable autonomous monitoring."}
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
                      showCopyMessage("Webhook URL copied.");
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
                <div className="flex items-center gap-3 font-mono text-xs uppercase tracking-wider text-[#6E6E68]">
                  <span className="h-px flex-1 bg-[#2B2A24]" />
                  <span>OR</span>
                  <span className="h-px flex-1 bg-[#2B2A24]" />
                </div>
                <p className="text-sm leading-relaxed text-[#A1A19A]">
                  Create a pull request with a lightweight, zero-dependency reporter for supported frontend and backend errors.
                </p>
                {createdProject.prUrl ? (
                  <div className="rounded border border-emerald-900/50 bg-emerald-950/20 p-4">
                    <p className="flex items-center gap-2 text-sm font-medium text-emerald-300">
                      <CheckCircle2 aria-hidden="true" size={16} /> Pull request generated successfully!
                    </p>
                    <a
                      href={createdProject.prUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-3 inline-flex items-center gap-1.5 font-mono text-sm text-[#F59E0B] hover:text-[#FDBA32]"
                    >
                      View &amp; Merge Pull Request on GitHub <ExternalLink aria-hidden="true" size={14} />
                    </a>
                    <p className="mt-2 text-xs leading-relaxed text-[#A1A19A]">
                      Merge this pull request to complete error monitoring integration with your project.
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col items-start gap-2">
                    <button
                      type="button"
                      onClick={() => void handleAutoPr(createdProject)}
                      disabled={autoPrProjectId === createdProject.id}
                      className="inline-flex min-h-10 items-center justify-center gap-2 rounded bg-[#F59E0B] px-4 font-mono text-sm font-medium text-black transition-colors hover:bg-[#D97706] disabled:cursor-wait disabled:opacity-70"
                    >
                      {autoPrProjectId === createdProject.id ? (
                        <>
                          <LoaderCircle aria-hidden="true" className="animate-spin" size={16} />
                          Creating setup pull request...
                        </>
                      ) : "Auto-Setup Error Tracking"}
                    </button>
                    {autoPrProjectId === createdProject.id && (
                      <p className="text-xs text-[#8E8E86]">This usually takes a few seconds.</p>
                    )}
                    {autoPrError && (
                      <div role="alert" className="flex flex-wrap items-center gap-3 rounded border border-rose-800/40 bg-rose-950/20 px-3 py-2 text-sm text-rose-200">
                        <span>{autoPrError}</span>
                        <button
                          type="button"
                          onClick={() => void handleAutoPr(createdProject)}
                          disabled={autoPrProjectId === createdProject.id}
                          className="inline-flex items-center gap-1.5 font-mono text-xs text-rose-200 underline hover:text-white disabled:opacity-50"
                        >
                          Try Again
                        </button>
                      </div>
                    )}
                  </div>
                )}
                <p className="text-xs leading-relaxed text-[#8E8E86]">
                  Send a JSON POST with <code className="text-[#D4D4CE]">projectName</code>, <code className="text-[#D4D4CE]">message</code>, and <code className="text-[#D4D4CE]">stackTrace</code>.
                </p>
              </div>
            ) : !connectedRepository ? (
              <div className="mt-6 flex flex-col gap-4">
                <p className="text-sm leading-relaxed text-[#A1A19A]">
                  Healix needs repository permissions to inspect commits, diagnose incidents, and submit verified fix pull requests.
                </p>
                {githubInstallationIds.length > 0 && (
                  <div className="flex flex-col gap-2">
                    <p className="font-mono text-xs uppercase tracking-wider text-[#8E8E86]">Existing installations</p>
                    {githubInstallationIds.map((installationId) => (
                      <div key={installationId} className="flex flex-wrap items-center justify-between gap-3 rounded border border-[#2B2A24] bg-[#121211] p-3">
                        <span className="font-mono text-xs text-[#A1A19A]">GitHub App installation {installationId}</span>
                        <span className="flex items-center gap-3">
                          <Link
                            href={`/projects/new/select-repo?installation_id=${encodeURIComponent(installationId)}`}
                            className="font-mono text-xs text-[#F59E0B] hover:text-[#FDBA32]"
                          >
                            Browse repositories
                          </Link>
                          <a
                            href={`/api/github/install?installation_id=${encodeURIComponent(installationId)}`}
                            className="font-mono text-xs text-[#8E8E86] hover:text-[#EDEDE8]"
                          >
                            Update access
                          </a>
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                {formError && (
                  <p role="alert" className="rounded border border-rose-800/40 bg-rose-950/20 px-3 py-2 text-sm text-rose-200">
                    {formError}
                  </p>
                )}
                <a
                  href="/api/github/install"
                  className="inline-flex min-h-10 items-center justify-center gap-2 rounded bg-[#F59E0B] px-4 font-mono text-sm font-medium text-black transition-colors hover:bg-[#D97706]"
                >
                  Connect GitHub Repository <ExternalLink aria-hidden="true" size={15} />
                </a>
              </div>
            ) : (
              <form key={`${connectedRepository.installationId}:${connectedRepository.owner}/${connectedRepository.repo}`} className="mt-6 flex flex-col gap-5" onSubmit={submitProject}>
                <input type="hidden" name="githubInstallationId" value={connectedRepository.installationId} />
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField label="Project name" name="name" placeholder="Project name" defaultValue={connectedRepository.repo} required />
                  <FormField label="Repository owner" name="repoOwner" defaultValue={connectedRepository.owner} readOnly required />
                  <FormField label="Repository name" name="repoName" defaultValue={connectedRepository.repo} readOnly required />
                </div>

                <div className="grid gap-4 border-t border-[#2B2A24] pt-4 sm:grid-cols-2">
                  <FormField label="Default branch" name="defaultBranch" defaultValue={connectedRepository.branch} readOnly required />
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
                      <FormField label="Vercel resource ID" name="platformProjectId" placeholder="prj_xxxxxxxxxxxxxxxxxxxx" required helper="Found in Vercel resource settings → General." />
                      <FormField label="Vercel Access Token" name="platformApiToken" type="password" placeholder="Vercel personal access token" required helper="Generated under Vercel Account Settings → Tokens." />
                      <FormField label="Vercel Team ID (optional)" name="platformTeamId" placeholder="team_xxxxxxxxxxxxxxxxxxxx" helper="Leave blank for a personal account." />
                    </div>
                  )}

                  {deploymentProvider === "RENDER" && (
                    <div className="grid gap-4 sm:grid-cols-2">
                      <FormField label="Render Project ID" name="platformProjectId" placeholder="srv-xxxxxxxxxxxxxxxxxxxx" required helper="Found in the URL of your Render project dashboard." />
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

      {editingProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden overscroll-contain bg-black/80 p-4 backdrop-blur-sm">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-project-title"
            className="hide-scrollbar max-h-[calc(100dvh-2rem)] w-full max-w-2xl overflow-y-auto overscroll-contain rounded-lg border border-[#2B2A24] bg-[#181816] p-6 shadow-2xl"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-mono text-xs tracking-wider text-[#8A8A82]">SERVICE SETTINGS</p>
                <h2 id="edit-project-title" className="mt-2 text-xl font-semibold text-[#EDEDE8]">Edit project</h2>
                <p className="mt-2 text-sm leading-relaxed text-[#A1A19A]">
                  Repository details stay connected to the selected GitHub repository. Leave a saved provider key blank to keep it unchanged.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setEditingProject(null);
                  setProjectError("");
                }}
                disabled={isUpdatingProject}
                aria-label="Close dialog"
                className="flex size-8 shrink-0 items-center justify-center rounded border border-[#383730] text-[#A1A19A] transition-colors hover:text-[#EDEDE8]"
              >
                <X aria-hidden="true" size={16} />
              </button>
            </div>
            <form className="mt-6 flex flex-col gap-5" onSubmit={submitProjectEdit}>
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField label="Project name" name="name" defaultValue={editingProject.name} required />
                <FormField label="Repository owner" name="repoOwner" defaultValue={editingProject.repoOwner} readOnly required />
                <FormField label="Repository name" name="repoName" defaultValue={editingProject.repoName} readOnly required />
                <FormField label="Default branch" name="defaultBranch" defaultValue={editingProject.defaultBranch} readOnly required />
              </div>

              <div className="grid gap-4 border-t border-[#2B2A24] pt-4 sm:grid-cols-2">
                <FormField
                  label="Deployed URL (optional)"
                  name="deployedUrl"
                  type="url"
                  placeholder="https://api.yourdomain.com"
                  defaultValue={editingProject.deployedUrl ?? ""}
                />
                <label className="flex flex-col gap-1.5 text-sm text-[#D4D4CE]">
                  Runtime configuration provider (optional)
                  <select
                    name="deploymentProvider"
                    value={editingDeploymentProvider}
                    onChange={(event) => setEditingDeploymentProvider(event.target.value as DeploymentProvider)}
                    className={fieldClassName}
                  >
                    <option value="NONE">None</option>
                    <option value="VERCEL">Vercel</option>
                    <option value="RENDER">Render</option>
                    <option value="CUSTOM">Custom webhook</option>
                  </select>
                </label>
              </div>

              {editingDeploymentProvider === "NONE" && (
                <p className="rounded border border-[#2B2A24] bg-[#121211] px-3 py-2 text-sm leading-relaxed text-[#A1A19A]">
                  Healix will handle automated code fixes and revert PRs on GitHub. Automated runtime configuration patching will be skipped.
                </p>
              )}
              {editingDeploymentProvider === "VERCEL" && (
                <>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormField
                      label="Vercel resource ID"
                      name="platformProjectId"
                      placeholder="prj_xxxxxxxxxxxxxxxxxxxx"
                      defaultValue={editingProject.deploymentProvider === "VERCEL" ? editingProject.platformProjectId ?? "" : ""}
                      required
                      helper="Found in Vercel resource settings → General."
                    />
                    <FormField
                      label="Vercel Access Token"
                      name="platformApiToken"
                      type="password"
                      placeholder={editingProject.hasPlatformApiToken && editingProject.deploymentProvider === "VERCEL" ? "Leave blank to keep the saved token" : "Vercel personal access token"}
                      required={!editingProject.hasPlatformApiToken || editingProject.deploymentProvider !== "VERCEL"}
                      helper="Generated under Vercel Account Settings → Tokens."
                    />
                    <FormField
                      label="Vercel Team ID (optional)"
                      name="platformTeamId"
                      placeholder="team_xxxxxxxxxxxxxxxxxxxx"
                      defaultValue={editingProject.deploymentProvider === "VERCEL" ? editingProject.platformTeamId ?? "" : ""}
                      helper="Leave blank for a personal account."
                    />
                  </div>
                  <p className="rounded border border-[#2B2A24] bg-[#121211] px-3 py-2 text-sm leading-relaxed text-[#A1A19A]">
                    Healix will use this Vercel connection only for approved runtime configuration patches.
                  </p>
                </>
              )}
              {editingDeploymentProvider === "RENDER" && (
                <>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormField
                      label="Render Project ID"
                      name="platformProjectId"
                      placeholder="srv-xxxxxxxxxxxxxxxxxxxx"
                      defaultValue={editingProject.deploymentProvider === "RENDER" ? editingProject.platformProjectId ?? "" : ""}
                      required
                      helper="Found in the URL of your Render project dashboard."
                    />
                    <FormField
                      label="Render API Key"
                      name="platformApiToken"
                      type="password"
                      placeholder={editingProject.hasPlatformApiToken && editingProject.deploymentProvider === "RENDER" ? "Leave blank to keep the saved key" : "Render API key"}
                      required={!editingProject.hasPlatformApiToken || editingProject.deploymentProvider !== "RENDER"}
                      helper="Generated under Render Account Settings → API Keys."
                    />
                  </div>
                  <p className="rounded border border-[#2B2A24] bg-[#121211] px-3 py-2 text-sm leading-relaxed text-[#A1A19A]">
                    Healix will use this Render connection only for approved runtime configuration patches.
                  </p>
                </>
              )}
              {editingDeploymentProvider === "CUSTOM" && (
                <>
                  <p className="rounded border border-[#2B2A24] bg-[#121211] px-3 py-2 text-sm leading-relaxed text-[#A1A19A]">
                    Healix will send signed requests to this endpoint when approved runtime configuration patches are needed.
                  </p>
                  <FormField
                    label="Custom webhook URL"
                    name="customWebhookUrl"
                    type="url"
                    placeholder="https://infra.yourcompany.com/api/healix-patch"
                    defaultValue={editingProject.deploymentProvider === "CUSTOM" ? editingProject.customWebhookUrl ?? "" : ""}
                    required
                    helper="Requests include configKey and configValue and use an HMAC-SHA256 signature."
                  />
                </>
              )}

              {projectError && (
                <p role="alert" className="rounded border border-rose-800/40 bg-rose-950/20 px-3 py-2 text-sm text-rose-200">
                  {projectError}
                </p>
              )}
              <button
                type="submit"
                disabled={isUpdatingProject}
                className="mt-1 inline-flex min-h-10 items-center justify-center gap-2 rounded bg-[#F59E0B] px-4 font-mono text-sm font-medium text-black transition-colors hover:bg-[#D97706] disabled:cursor-wait disabled:opacity-70"
              >
                {isUpdatingProject ? "Saving…" : "Save changes"}
              </button>
            </form>
          </section>
        </div>
      )}
    </main>
  );
}
