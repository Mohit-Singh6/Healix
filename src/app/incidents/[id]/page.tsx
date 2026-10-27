import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TriageWorkbench } from "@/components/incidents/TriageWorkbench";
import { getIncidentById, incidents } from "@/lib/incidents";

type IncidentPageProps = {
  params: Promise<{ id: string }>;
};

export function generateStaticParams() {
  return incidents.map((incident) => ({ id: incident.id }));
}

export async function generateMetadata({
  params,
}: IncidentPageProps): Promise<Metadata> {
  const { id } = await params;
  const incident = getIncidentById(id);

  return {
    title: incident ? `${incident.id} · ${incident.title}` : "Incident not found",
  };
}

export default async function IncidentDetailPage({
  params,
}: IncidentPageProps) {
  const { id } = await params;
  const incident = getIncidentById(id);

  if (!incident) {
    notFound();
  }

  return <TriageWorkbench incident={incident} />;
}
