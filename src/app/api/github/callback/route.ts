import { auth } from "@/src/auth";
import { listInstallationRepositories } from "@/src/lib/github-app";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

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
  const target = new URL("/dashboard", request.url);
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

  if (!state || !expectedState || state !== expectedState) {
    return new Response("GitHub installation state validation failed.", { status: 400 });
  }

  if (setupAction !== "install" || !installationId || !/^[1-9]\d*$/.test(installationId)) {
    return dashboardRedirect(request, "installation_not_completed", true);
  }

  try {
    const repositories = await listInstallationRepositories(installationId);
    if (repositories.length === 0) {
      return dashboardRedirect(request, "no_repositories", true);
    }

    const target = repositories.length === 1
      ? selectedRepositoryUrl(
        request,
        installationId,
        repositories[0].owner.login,
        repositories[0].name,
        repositories[0].default_branch || "main",
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
