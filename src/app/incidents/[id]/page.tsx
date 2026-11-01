import IncidentWorkbench from "@/src/components/incidents/IncidentWorkbench";
import { auth } from "@/src/auth";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/src/lib/prisma";
import { getUserIncident } from "@/src/lib/incidents";

export default async function IncidentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.email) redirect("/auth");

  const { id } = await params;
  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  });
  if (!user) redirect("/auth");

  const incident = await getUserIncident(user.id, id);
  if (!incident) notFound();

  return <IncidentWorkbench key={id} incidentId={id} incident={incident} />;
}
