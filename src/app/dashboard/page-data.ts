import { auth } from "@/src/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/src/lib/prisma";
import { listUserIncidents } from "@/src/lib/incidents";

export async function getDashboardData() {
  const isDevelopment = process.env.NODE_ENV === "development";
  const session = await auth();

  const user = session?.user?.email
    ? await prisma.user.findUnique({
        where: { email: session.user.email },
        select: { id: true },
      })
    : null;
  if (!user && !isDevelopment) redirect("/auth");

  const userId = user?.id ?? null;

  const [projects, installationRows, incidents, resolvedIncidents, pendingApprovals, activeIncidents] = await Promise.all([
    prisma.project.findMany({
      where: userId ? { userId } : {},
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        repoOwner: true,
        repoName: true,
        defaultBranch: true,
        deployedUrl: true,
        githubInstallationId: true,
        deploymentProvider: true,
        platformServiceId: true,
        platformApiToken: true,
        platformTeamId: true,
        customWebhookUrl: true,
        errorTrackingPrUrl: true,
        errorTrackingPrStatus: true,
      },
    }),
    prisma.project.findMany({
      where: {
        ...(userId ? { userId } : {}),
        githubInstallationId: { not: null },
      },
      distinct: ["githubInstallationId"],
      select: { githubInstallationId: true },
    }),
    listUserIncidents(userId),
    prisma.incident.count({
      where: {
        ...(userId ? { project: { is: { userId } } } : {}),
        OR: [
          { status: "RESOLVED" },
          { status: { not: "DISMISSED" }, proposedAction: "NO_ACTION" },
        ],
      },
    }),
    prisma.incident.count({
      where: {
        ...(userId ? { project: { is: { userId } } } : {}),
        status: "PENDING_APPROVAL",
        proposedAction: { not: "NO_ACTION" },
      },
    }),
    prisma.incident.count({
      where: {
        ...(userId ? { project: { is: { userId } } } : {}),
        OR: [
          { status: "PENDING_APPROVAL", proposedAction: { not: "NO_ACTION" } },
          { status: "MITIGATING" },
          { status: "INVESTIGATING", proposedAction: null },
          { status: "INVESTIGATING", proposedAction: "MANUAL_INTERVENTION" },
        ],
      },
    }),
  ]);

  return {
    initialProjects: projects.map((project) => {
      const { platformApiToken, ...safeProject } = project;
      return {
        ...safeProject,
        platformProjectId: safeProject.platformServiceId,
        hasPlatformApiToken: Boolean(platformApiToken),
      };
    }),
    githubInstallationIds: installationRows.flatMap((project) =>
      project.githubInstallationId ? [project.githubInstallationId] : [],
    ),
    initialIncidents: incidents,
    resolvedIncidents,
    pendingApprovals,
    activeIncidents,
  };
}
