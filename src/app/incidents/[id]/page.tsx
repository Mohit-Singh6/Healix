import IncidentWorkbench from "@/src/components/incidents/IncidentWorkbench";

export default async function IncidentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <IncidentWorkbench incidentId={id} />;
}
