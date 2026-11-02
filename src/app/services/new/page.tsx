import { auth } from "@/src/auth";
import ServiceConfigForm from "@/src/components/services/ServiceConfigForm";
import { getInstallationRepository } from "@/src/lib/github-app";
import { prisma } from "@/src/lib/prisma";
import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

const PENDING_INSTALLATION_COOKIE = "healix_pending_github_installation";

export default async function NewServicePage({
  searchParams,
}: {
  searchParams: Promise<{
    installation_id?: string;
    owner?: string;
    repo?: string;
    branch?: string;
  }>;
}) {
  const session = await auth();
  if (!session?.user?.email) redirect("/auth");

  const { installation_id: installationId, owner, repo, branch } = await searchParams;
  if (
    !installationId ||
    !/^[1-9]\d*$/.test(installationId) ||
    !owner ||
    !repo ||
    !branch
  ) {
    redirect("/dashboard?github_error=installation_expired");
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  });
  if (!user) redirect("/auth");

  const cookieStore = await cookies();
  const pendingInstallationId = cookieStore.get(PENDING_INSTALLATION_COOKIE)?.value;
  const isPendingInstallation = pendingInstallationId === installationId;
  const isLinkedInstallation = Boolean(await prisma.project.findFirst({
    where: { userId: user.id, githubInstallationId: installationId },
    select: { id: true },
  }));
  if (!isPendingInstallation && !isLinkedInstallation) {
    redirect("/dashboard?github_error=installation_expired");
  }

  let repository;
  try {
    repository = await getInstallationRepository(installationId, owner, repo);
  } catch (error) {
    console.error("Could not verify the selected repository for service setup.", error);
    redirect(`/services/new/select-repo?installation_id=${encodeURIComponent(installationId)}`);
  }

  const verifiedBranch = repository.default_branch || "main";
  if (
    repository.owner.login.toLowerCase() !== owner.toLowerCase() ||
    repository.name.toLowerCase() !== repo.toLowerCase() ||
    branch !== verifiedBranch
  ) {
    redirect(`/services/new/select-repo?installation_id=${encodeURIComponent(installationId)}`);
  }

  const existingService = await prisma.project.findFirst({
    where: {
      userId: user.id,
      repoOwner: { equals: repository.owner.login, mode: "insensitive" },
      repoName: { equals: repository.name, mode: "insensitive" },
    },
    select: { id: true, name: true, apiKey: true },
  });

  return (
    <main className="min-h-screen bg-[#121211] px-4 py-12 text-[#EDEDE8]">
      <section className="mx-auto max-w-3xl">
        <Link
          href={`/services/new/select-repo?installation_id=${encodeURIComponent(installationId)}`}
          className="inline-flex items-center gap-2 font-mono text-xs text-[#A1A19A] hover:text-[#EDEDE8]"
        >
          <ArrowLeftIcon /> Back to repositories
        </Link>
        <p className="mt-8 font-mono text-xs tracking-widest text-[#F59E0B]">NEW SERVICE</p>
        <h1 className="mt-2 text-2xl font-semibold">Configure {repository.full_name}</h1>
        <p className="mt-2 text-sm text-[#A1A19A]">
          Repository and branch are verified from your GitHub App installation and cannot be changed here.
        </p>
        <ServiceConfigForm
          installationId={installationId}
          owner={repository.owner.login}
          repo={repository.name}
          branch={verifiedBranch}
          initialResult={existingService ? {
            serviceName: existingService.name,
            webhookUrl: `/api/incidents/webhook?apiKey=${encodeURIComponent(existingService.apiKey)}`,
          } : null}
        />
      </section>
    </main>
  );
}

function ArrowLeftIcon() {
  return <span aria-hidden="true">&larr;</span>;
}
