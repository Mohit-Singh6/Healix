import { auth } from "@/src/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/src/lib/prisma";
import { listUserIncidents } from "@/src/lib/incidents";

export async function getDashboardData() {
  const session = await auth();
  if (!session?.user?.email) redirect("/auth");

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  });
  if (!user) redirect("/auth");

  const [services, incidents, resolvedIncidents, pendingApprovals, activeIncidents] = await Promise.all([
    prisma.project.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        repoOwner: true,
        repoName: true,
        defaultBranch: true,
        deployedUrl: true,
      },
    }),
    listUserIncidents(user.id),
    prisma.incident.count({
      where: { project: { is: { userId: user.id } }, status: "RESOLVED" },
    }),
    prisma.incident.count({
      where: { project: { is: { userId: user.id } }, status: "PENDING_APPROVAL" },
    }),
    prisma.incident.count({
      where: {
        project: { is: { userId: user.id } },
        status: { in: ["INVESTIGATING", "PENDING_APPROVAL", "MITIGATING"] },
      },
    }),
  ]);

  return {
    initialServices: services,
    initialIncidents: incidents,
    resolvedIncidents,
    pendingApprovals,
    activeIncidents,
  };
}
