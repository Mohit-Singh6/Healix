import IncidentWorkbench from "@/src/components/incidents/IncidentWorkbench";
import { getMockIncidentData } from "@/src/components/incidents/incident-data";

export default async function IncidentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const incident = getMockIncidentData(id);
  return <IncidentWorkbench key={id} incidentId={id} incident={incident} />;
}
