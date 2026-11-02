import { auth } from "@/src/auth";
import { listInstallationRepositories } from "@/src/lib/github-app";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";

const INSTALL_STATE_COOKIE = "healix_github_install_state";
const PENDING_INSTALLATION_COOKIE = "healix_pending_github_installation";

function clearInstallStateCookie(response: NextResponse) {
  response.cookies.set(INSTALL_STATE_COOKIE, "", {
    httpOnly: true,
    maxAge: 0,
    path: "/api/github/callback",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
}

function dashboardRedirect(request: Request, error: string, clearInstallState = false) {
  const response = NextResponse.redirect(
    new URL(`/dashboard?github_error=${encodeURIComponent(error)}`, request.url),
  );
  if (clearInstallState) clearInstallStateCookie(response);
  return response;
}

function selectedRepositoryUrl(
  request: Request,
  installationId: string,
  owner: string,
  repo: string,
  branch: string,
) {
  const target = new URL("/services/new", request.url);
  target.searchParams.set("installation_id", installationId);
  target.searchParams.set("owner", owner);
  target.searchParams.set("repo", repo);
  target.searchParams.set("branch", branch);
  return target;
}

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.redirect(new URL("/auth", request.url));
  }

  const url = new URL(request.url);
  const state = url.searchParams.get("state");
  const installationId = url.searchParams.get("installation_id");
  const setupAction = url.searchParams.get("setup_action");
  const cookieStore = await cookies();
  const expectedState = cookieStore.get(INSTALL_STATE_COOKIE)?.value;
  const hasValidState = Boolean(state && expectedState && state === expectedState);

  if (
    (setupAction !== "install" && setupAction !== "update") ||
    !installationId ||
    !/^[1-9]\d*$/.test(installationId)
  ) {
    return dashboardRedirect(request, "installation_not_completed", true);
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    });
    if (!user) return dashboardRedirect(request, "installation_not_completed", true);

    const linkedInstallation = hasValidState
      ? true
      : Boolean(await prisma.project.findFirst({
          where: { userId: user.id, githubInstallationId: installationId },
          select: { id: true },
        }));
    if (!hasValidState && (setupAction !== "update" || !linkedInstallation)) {
      return new Response("GitHub installation state validation failed.", { status: 400 });
    }

    const repositories = await listInstallationRepositories(installationId);
    const existingServices = await prisma.project.findMany({
      where: { userId: user.id, githubInstallationId: installationId },
      select: { repoOwner: true, repoName: true },
    });
    const registeredSet = new Set(
      existingServices.map((service) => `${service.repoOwner}/${service.repoName}`.toLowerCase()),
    );
    const unconfiguredRepositories = repositories.filter(
      (repository) => !registeredSet.has(`${repository.owner.login}/${repository.name}`.toLowerCase()),
    );

    const target = unconfiguredRepositories.length === 1
      ? selectedRepositoryUrl(
        request,
        installationId,
        unconfiguredRepositories[0].owner.login,
        unconfiguredRepositories[0].name,
        unconfiguredRepositories[0].default_branch || "main",
      )
      : new URL(`/services/new/select-repo?installation_id=${encodeURIComponent(installationId)}`, request.url);
    const response = NextResponse.redirect(target);
    clearInstallStateCookie(response);
    response.cookies.set(PENDING_INSTALLATION_COOKIE, installationId, {
      httpOnly: true,
      maxAge: 30 * 60,
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });
    return response;
  } catch (error) {
    console.error("Could not list repositories for the GitHub App installation.", error);
    return dashboardRedirect(request, "repository_lookup_failed", true);
  }
}
