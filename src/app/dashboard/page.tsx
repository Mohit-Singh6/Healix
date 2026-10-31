import DashboardView from "@/src/components/dashboard/DashboardView";
import { auth } from "@/src/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/src/lib/prisma";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.email) redirect("/auth");

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: {
      projects: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          name: true,
          repoOwner: true,
          repoName: true,
          defaultBranch: true,
          deployedUrl: true,
        },
      },
    },
  });

  return <DashboardView initialProjects={user?.projects ?? []} />;
}
