import { auth } from "@/src/auth";
import { listInstallationRepositories } from "@/src/lib/github-app";
import { prisma } from "@/src/lib/prisma";
import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

const PENDING_INSTALLATION_COOKIE = "healix_pending_github_installation";

export default async function SelectRepositoryPage({
  searchParams,
}: {
  searchParams: Promise<{ installation_id?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.email) redirect("/auth");

  const { installation_id: installationId } = await searchParams;
  const cookieStore = await cookies();
  const pendingInstallationId = cookieStore.get(PENDING_INSTALLATION_COOKIE)?.value;
  if (!installationId || !/^[1-9]\d*$/.test(installationId)) {
    redirect("/dashboard?github_error=installation_expired");
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  });
  if (!user) redirect("/auth");

  const installationIsLinked = pendingInstallationId === installationId
    ? true
    : Boolean(await prisma.project.findFirst({
        where: { userId: user.id, githubInstallationId: installationId },
        select: { id: true },
      }));
  if (!installationIsLinked) redirect("/dashboard?github_error=installation_expired");

  let repositories;
  try {
    repositories = await listInstallationRepositories(installationId);
  } catch (error) {
    console.error("Could not load repositories for GitHub repository selection.", error);
    redirect("/dashboard?github_error=repository_lookup_failed");
  }

  const existingServices = await prisma.project.findMany({
    where: { userId: user.id, githubInstallationId: installationId },
    select: { repoOwner: true, repoName: true },
  });
  const registeredRepositories = new Set(
    existingServices.map((service) => `${service.repoOwner}/${service.repoName}`.toLowerCase()),
  );

  return (
    <main className="min-h-screen bg-[#121211] px-4 py-12 text-[#EDEDE8]">
      <section className="mx-auto max-w-3xl">
        <Link href="/dashboard" className="font-mono text-xs text-[#A1A19A] hover:text-[#EDEDE8]">
          &larr; Back to dashboard
        </Link>
        <p className="mt-8 font-mono text-xs tracking-widest text-[#F59E0B]">GITHUB APP CONNECTED</p>
        <h1 className="mt-2 text-2xl font-semibold">Choose a repository</h1>
        <p className="mt-2 text-sm text-[#A1A19A]">
          Select an unconfigured repository to add as a service. Repositories already connected to this workspace are marked below.
        </p>
        <a
          href={`/api/github/install?installation_id=${encodeURIComponent(installationId)}`}
          className="mt-5 inline-flex rounded border border-[#2B2A24] px-3 py-2 font-mono text-xs text-[#A1A19A] transition-colors hover:border-[#F59E0B]/50 hover:text-[#EDEDE8]"
        >
          Manage repository access on GitHub
        </a>
        <ul className="mt-6 flex flex-col gap-3">
          {repositories.map((repository) => {
            const branch = repository.default_branch || "main";
            const isRegistered = registeredRepositories.has(repository.full_name.toLowerCase());
            const query = new URLSearchParams({
              installation_id: installationId,
              owner: repository.owner.login,
              repo: repository.name,
              branch,
            });

            return (
              <li key={repository.id}>
                <div className={`flex items-center justify-between gap-4 rounded-lg border border-[#2B2A24] bg-[#1B1B18] p-4 ${isRegistered ? "opacity-65" : "transition-colors hover:border-[#F59E0B]/60"}`}>
                  <span className="min-w-0">
                    <span className="flex items-center gap-2 truncate font-mono text-sm text-[#EDEDE8]">
                      {repository.full_name}
                      <span className="rounded border border-[#383730] px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-[#8E8E86]">
                        {repository.private ? "Private" : "Public"}
                      </span>
                    </span>
                    <span className="mt-1 block font-mono text-xs text-[#8E8E86]">
                      Primary branch: {branch}
                    </span>
                  </span>
                  {isRegistered ? (
                    <span aria-disabled="true" className="shrink-0 rounded border border-[#383730] px-3 py-1.5 font-mono text-xs text-[#8E8E86]">
                      Already Added
                    </span>
                  ) : (
                    <Link
                      href={`/services/new?${query.toString()}`}
                      className="shrink-0 rounded bg-[#F59E0B] px-3 py-1.5 font-mono text-xs font-medium text-black transition-colors hover:bg-[#D97706]"
                    >
                      Configure Service
                    </Link>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
        {repositories.length === 0 && (
          <p className="mt-6 rounded border border-[#2B2A24] bg-[#1B1B18] p-4 text-sm text-[#A1A19A]">
            This installation has no accessible repositories. Use GitHub settings above to grant access, then return here to refresh.
          </p>
        )}
      </section>
    </main>
  );
}
