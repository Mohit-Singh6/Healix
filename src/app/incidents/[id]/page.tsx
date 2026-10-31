import IncidentWorkbench from "@/src/components/incidents/IncidentWorkbench";
import { getMockIncidentData } from "@/src/components/incidents/incident-data";
import { auth } from "@/src/auth";
import { redirect } from "next/navigation";

export default async function IncidentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/auth");

  const { id } = await params;
  const incident = getMockIncidentData(id);
  return <IncidentWorkbench key={id} incidentId={id} incident={incident} />;
}
