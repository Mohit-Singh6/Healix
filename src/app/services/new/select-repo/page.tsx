import { auth } from "@/src/auth";
import {
  listInstallationRepositories,
} from "@/src/lib/github-app";
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
  if (
    !installationId ||
    !/^[1-9]\d*$/.test(installationId) ||
    installationId !== pendingInstallationId
  ) {
    redirect("/dashboard?github_error=installation_expired");
  }

  let repositories;
  try {
    repositories = await listInstallationRepositories(installationId);
  } catch (error) {
    console.error("Could not load repositories for GitHub repository selection.", error);
    redirect("/dashboard?github_error=repository_lookup_failed");
  }

  if (repositories.length === 0) redirect("/dashboard?github_error=no_repositories");

  return (
    <main className="min-h-screen bg-[#121211] px-4 py-12 text-[#EDEDE8]">
      <section className="mx-auto max-w-3xl">
        <Link href="/dashboard" className="font-mono text-xs text-[#A1A19A] hover:text-[#EDEDE8]">
          &larr; Back to dashboard
        </Link>
        <p className="mt-8 font-mono text-xs tracking-widest text-[#F59E0B]">GITHUB APP CONNECTED</p>
        <h1 className="mt-2 text-2xl font-semibold">Choose a repository</h1>
        <p className="mt-2 text-sm text-[#A1A19A]">
          Select the repository Healix should monitor. Its repository and default branch will be locked in the service form.
        </p>
        <ul className="mt-6 flex flex-col gap-3">
          {repositories.map((repository) => {
            const branch = repository.default_branch || "main";
            const query = new URLSearchParams({
              installation_id: installationId,
              owner: repository.owner.login,
              repo: repository.name,
              branch,
            });

            return (
              <li key={repository.id}>
                <a
                  href={`/dashboard?${query.toString()}`}
                  className="flex items-center justify-between gap-4 rounded-lg border border-[#2B2A24] bg-[#1B1B18] p-4 transition-colors hover:border-[#F59E0B]/60"
                >
                  <span className="min-w-0">
                    <span className="block truncate font-mono text-sm text-[#EDEDE8]">
                      {repository.full_name}
                    </span>
                    <span className="mt-1 block font-mono text-xs text-[#8E8E86]">
                      Default branch: {branch}
                    </span>
                  </span>
                  <span className="shrink-0 font-mono text-xs text-[#F59E0B]">Connect &rarr;</span>
                </a>
              </li>
            );
          })}
        </ul>
      </section>
    </main>
  );
}
