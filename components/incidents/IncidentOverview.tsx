"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ArrowUpRight,
  AudioLines,
  CircleHelp,
  Clock3,
  Layers3,
  Radio,
  RotateCcw,
  ShieldAlert,
  Siren,
  Workflow,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  getStageLabel,
  incidents,
  type Incident,
  type IncidentSeverity,
  type IncidentStage,
} from "@/lib/incidents";
import { cn } from "@/lib/utils";

type SeverityFilter = "ALL" | IncidentSeverity;
type StageFilter = "ALL" | IncidentStage;

const severityFilters: { value: SeverityFilter; label: string }[] = [
  { value: "ALL", label: "All" },
  { value: "P1", label: "P1" },
  { value: "P2", label: "P2" },
  { value: "P3", label: "P3" },
];

const services = [
  { value: "ALL", label: "All services" },
  { value: "checkout-api", label: "checkout-api" },
  { value: "payments-worker", label: "payments-worker" },
  { value: "identity-edge", label: "identity-edge" },
];

const stages: { value: StageFilter; label: string }[] = [
  { value: "ALL", label: "All stages" },
  { value: "AWAITING_APPROVAL", label: "Approval queue" },
  { value: "DIAGNOSING", label: "Diagnosing" },
  { value: "MITIGATED", label: "Mitigated" },
];

const severityStyles: Record<IncidentSeverity, string> = {
  P1: "border-rose-500/25 bg-rose-500/[0.08] text-rose-300",
  P2: "border-amber-400/25 bg-amber-400/[0.08] text-amber-200",
  P3: "border-sky-400/25 bg-sky-400/[0.08] text-sky-200",
};

const stageStyles: Record<IncidentStage, string> = {
  AWAITING_APPROVAL:
    "border-amber-400/25 bg-amber-400/[0.08] text-amber-200",
  DIAGNOSING: "border-cyan-400/25 bg-cyan-400/[0.08] text-cyan-200",
  MITIGATED: "border-emerald-400/20 bg-emerald-400/[0.07] text-emerald-200",
};

function MetricCard({
  label,
  value,
  detail,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string;
  detail: string;
  icon: typeof AudioLines;
  accent: "cyan" | "blue" | "green";
}) {
  const accentStyles = {
    cyan: "border-cyan-400/20 bg-cyan-400/[0.08] text-cyan-300",
    blue: "border-blue-400/20 bg-blue-400/[0.08] text-blue-300",
    green: "border-emerald-400/20 bg-emerald-400/[0.08] text-emerald-300",
  }[accent];

  return (
    <Card className="border-white/[0.07] bg-[#0b1322]/75 py-0 ring-0 backdrop-blur-md">
      <CardContent className="flex items-start justify-between gap-4 p-4 sm:p-5">
        <div>
          <p className="text-[11px] font-medium text-slate-400">{label}</p>
          <p className="mt-2 text-[26px] font-semibold leading-none tracking-[-0.04em] text-slate-100">
            {value}
          </p>
          <p className="mt-2 text-[11px] text-slate-500">{detail}</p>
        </div>
        <span
          className={cn(
            "grid size-9 shrink-0 place-items-center rounded-xl border",
            accentStyles
          )}
        >
          <Icon className="size-4" />
        </span>
      </CardContent>
    </Card>
  );
}

function IncidentCard({ incident }: { incident: Incident }) {
  return (
    <Link
      href={`/incidents/${incident.id}`}
      className="group block rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/60"
      aria-label={`Open ${incident.id}: ${incident.title}`}
    >
      <Card className="border-white/[0.07] bg-[#0d1527]/75 py-0 transition duration-200 ring-0 backdrop-blur-md group-hover:border-cyan-400/25 group-hover:bg-[#101b30]/90 group-hover:shadow-[0_0_30px_rgba(6,182,212,0.06)]">
        <CardContent className="p-4 sm:p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex min-w-0 gap-3">
              <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-xl border border-rose-400/15 bg-rose-400/[0.06] text-rose-300">
                <ShieldAlert className="size-[17px]" />
              </span>
              <div className="min-w-0">
                <div className="mb-1.5 flex flex-wrap items-center gap-2">
                  <span className="font-mono text-[10px] tracking-wide text-slate-500">
                    {incident.id}
                  </span>
                  <Badge
                    variant="outline"
                    className={cn("h-5 px-1.5 font-mono text-[10px]", severityStyles[incident.severity])}
                  >
                    {incident.severity}
                  </Badge>
                  <Badge
                    variant="outline"
                    className={cn("h-5 px-1.5 text-[10px]", stageStyles[incident.stage])}
                  >
                    {incident.stage === "DIAGNOSING" && (
                      <span className="mr-1 size-1.5 animate-pulse rounded-full bg-cyan-300" />
                    )}
                    {getStageLabel(incident.stage)}
                  </Badge>
                </div>
                <h3 className="truncate text-[15px] font-medium text-slate-100 transition group-hover:text-cyan-100">
                  {incident.title}
                </h3>
                <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-400">
                  {incident.summary}
                </p>
              </div>
            </div>
            <span className="inline-flex shrink-0 items-center gap-1 self-end text-xs text-cyan-300 transition group-hover:translate-x-0.5 sm:self-start">
              Inspect
              <ArrowUpRight className="size-3.5" />
            </span>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-white/[0.06] pt-3 text-[11px] text-slate-400">
            <span className="inline-flex items-center gap-1.5">
              <Layers3 className="size-3.5 text-slate-500" />
              <span className="font-mono text-slate-300">
                {incident.occurrences.toLocaleString()}
              </span>
              affected events
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Radio className="size-3.5 text-slate-500" />
              <span className="font-mono text-slate-300">{incident.service}</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Clock3 className="size-3.5 text-slate-500" />
              Last seen {incident.lastSeen}
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function IncidentFilters({
  service,
  setService,
  severity,
  setSeverity,
  stage,
  setStage,
  onReset,
}: {
  service: string;
  setService: (value: string) => void;
  severity: SeverityFilter;
  setSeverity: (value: SeverityFilter) => void;
  stage: StageFilter;
  setStage: (value: StageFilter) => void;
  onReset: () => void;
}) {
  return (
    <Card
      id="services"
      className="border-white/[0.07] bg-[#0b1322]/75 py-0 ring-0 backdrop-blur-md"
    >
      <CardContent className="flex flex-col gap-4 p-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-medium uppercase tracking-[0.16em] text-slate-500">
              Origin
            </span>
            <Select
              value={service}
              onValueChange={(value) => setService(value ?? "ALL")}
            >
              <SelectTrigger
                aria-label="Filter by service origin"
                className="h-8 min-w-[164px] border-white/10 bg-[#080e1a] text-xs text-slate-300"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {services.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] font-medium uppercase tracking-[0.16em] text-slate-500">
              Severity
            </span>
            <ToggleGroup
              aria-label="Filter by severity"
              className="gap-1"
              value={[severity]}
              onValueChange={(values) => {
                const nextSeverity = severityFilters.find(
                (item) => item.value === values[0]
                )?.value;
                if (nextSeverity) {
                setSeverity(nextSeverity);
                }
              }}
            >
              {severityFilters.map((item) => (
                <ToggleGroupItem
                  key={item.value}
                  value={item.value}
                  variant="outline"
                  size="sm"
                  className="h-7 border-white/[0.08] px-2.5 text-[10px] text-slate-400 data-pressed:border-cyan-400/30 data-pressed:bg-cyan-400/[0.09] data-pressed:text-cyan-200"
                >
                  {item.label}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] font-medium uppercase tracking-[0.16em] text-slate-500">
              Stage
            </span>
            <Select
              value={stage}
              onValueChange={(value) =>
                setStage((value ?? "ALL") as StageFilter)
              }
            >
              <SelectTrigger
                aria-label="Filter by pipeline stage"
                className="h-8 min-w-[146px] border-white/10 bg-[#080e1a] text-xs text-slate-300"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {stages.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onReset}
          className="self-start text-xs text-slate-400 hover:text-slate-100 lg:self-auto"
        >
          <RotateCcw data-icon="inline-start" />
          Reset filters
        </Button>
      </CardContent>
    </Card>
  );
}

function IntakeAuditCard() {
  return (
    <Card
      id="audit-log"
      className="border-white/[0.07] bg-[#0b1322]/75 py-0 ring-0 backdrop-blur-md"
    >
      <CardHeader className="flex flex-row items-center justify-between border-b border-white/[0.06] px-4 py-3.5">
        <div className="flex items-center gap-2.5">
          <span className="grid size-8 place-items-center rounded-lg border border-blue-400/20 bg-blue-400/[0.07] text-blue-300">
            <AudioLines className="size-4" />
          </span>
          <div>
            <CardTitle className="text-sm text-slate-200">Latest intake</CardTitle>
            <p className="mt-0.5 text-[10px] text-slate-500">
              Node A · telemetry correlation
            </p>
          </div>
        </div>
        <Badge
          variant="outline"
          className="border-emerald-400/20 bg-emerald-400/[0.06] font-mono text-[9px] text-emerald-200"
        >
          <span className="mr-1 size-1.5 rounded-full bg-emerald-400" />
          STREAMING
        </Badge>
      </CardHeader>
      <CardContent className="grid gap-3 p-4 sm:grid-cols-3">
        {[
          ["14:11:42.308", "cluster.updated", "checkout-api"],
          ["14:11:39.041", "log.correlated", "payments-worker"],
          ["14:11:33.816", "alert.ingested", "identity-edge"],
        ].map(([timestamp, event, service]) => (
          <div
            key={timestamp}
            className="flex min-w-0 items-center gap-3 rounded-xl border border-white/[0.05] bg-white/[0.015] px-3 py-2.5"
          >
            <span className="size-1.5 shrink-0 rounded-full bg-cyan-400/80" />
            <div className="min-w-0">
              <p className="truncate font-mono text-[10px] text-slate-400">
                {timestamp} <span className="text-cyan-200/75">{event}</span>
              </p>
              <p className="mt-1 truncate text-[10px] text-slate-600">{service}</p>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export function IncidentOverview() {
  const [service, setService] = useState("ALL");
  const [severity, setSeverity] = useState<SeverityFilter>("ALL");
  const [stage, setStage] = useState<StageFilter>("ALL");

  const filteredIncidents = useMemo(
    () =>
      incidents.filter(
        (incident) =>
          (service === "ALL" || incident.service === service) &&
          (severity === "ALL" || incident.severity === severity) &&
          (stage === "ALL" || incident.stage === stage)
      ),
    [service, severity, stage]
  );

  function resetFilters() {
    setService("ALL");
    setSeverity("ALL");
    setStage("ALL");
  }

  return (
    <main className="mx-auto flex w-full max-w-[1480px] flex-1 flex-col gap-7 px-4 py-8 sm:px-6 lg:gap-8 lg:px-8 lg:py-10">
      <section className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
        <div>
          <div className="mb-3 flex items-center gap-2">
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-cyan-300/80">
              Operations / Production
            </span>
            <span className="size-1 rounded-full bg-slate-600" />
            <span className="font-mono text-[10px] text-slate-500">
              27 Oct 2026
            </span>
          </div>
          <h1 className="text-3xl font-semibold tracking-[-0.045em] text-slate-100 sm:text-[38px]">
            Incident command
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-slate-400">
            A live view of clustered production failures and the decisions waiting
            on your team.
          </p>
        </div>
        <div className="flex items-center gap-2 self-start rounded-full border border-emerald-400/15 bg-emerald-400/[0.05] px-3 py-2 md:self-auto">
          <span className="relative flex size-2">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-50" />
            <span className="relative inline-flex size-2 rounded-full bg-emerald-400" />
          </span>
          <span className="text-xs font-medium text-emerald-200">Live telemetry</span>
          <span className="font-mono text-[10px] text-emerald-200/50">just now</span>
        </div>
      </section>

      <section aria-label="Incident metrics" className="grid gap-3 sm:grid-cols-3">
        <MetricCard
          label="Raw ingested errors"
          value="1,420"
          detail="Across 3 connected streams · last 24h"
          icon={AudioLines}
          accent="cyan"
        />
        <MetricCard
          label="Clustered incidents"
          value="3 Active"
          detail="Deduplicated with pgvector similarity"
          icon={Layers3}
          accent="blue"
        />
        <MetricCard
          label="Noise reduction"
          value="99.8%"
          detail="1,417 repeated events grouped"
          icon={Workflow}
          accent="green"
        />
      </section>

      <IncidentFilters
        service={service}
        setService={setService}
        severity={severity}
        setSeverity={setSeverity}
        stage={stage}
        setStage={setStage}
        onReset={resetFilters}
      />

      <section aria-labelledby="incident-roster-heading" className="flex flex-col gap-3">
        <div className="flex items-end justify-between gap-4">
          <div>
            <div className="mb-1 flex items-center gap-2">
              <Siren className="size-3.5 text-cyan-300" />
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-slate-500">
                Triage roster
              </p>
            </div>
            <h2
              id="incident-roster-heading"
              className="text-lg font-semibold tracking-tight text-slate-100"
            >
              Active incidents
            </h2>
          </div>
          <p className="font-mono text-[11px] text-slate-500">
            {filteredIncidents.length.toString().padStart(2, "0")}{" "}
            <span className="text-slate-600">/ {incidents.length.toString().padStart(2, "0")}</span>
          </p>
        </div>

        {filteredIncidents.length > 0 ? (
          <div className="grid min-w-0 grid-cols-1 gap-3">
            {filteredIncidents.map((incident) => (
              <IncidentCard key={incident.id} incident={incident} />
            ))}
          </div>
        ) : (
          <Alert className="border-white/[0.08] bg-[#0d1527]/75">
            <CircleHelp className="text-slate-400" />
            <AlertTitle className="text-sm text-slate-200">
              No incidents match these filters
            </AlertTitle>
            <AlertDescription className="text-xs text-slate-400">
              Widen the service, severity, or pipeline stage filter to see more
              incidents.
            </AlertDescription>
          </Alert>
        )}
      </section>

      <IntakeAuditCard />

      <div className="flex flex-col gap-2 border-t border-white/[0.06] pt-4 text-[10px] text-slate-600 sm:flex-row sm:items-center sm:justify-between">
        <p>Node A → Node B → Node C complete · Node D approval gate ready</p>
        <Link
          href="/incidents/INC-4829"
          className={cn(
            buttonVariants({ variant: "link", size: "sm" }),
            "h-auto justify-start p-0 text-[10px] text-cyan-300 hover:text-cyan-200"
          )}
        >
          Open current approval
          <ArrowUpRight data-icon="inline-end" />
        </Link>
      </div>
    </main>
  );
}
