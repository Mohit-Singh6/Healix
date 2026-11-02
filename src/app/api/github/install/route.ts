import { randomBytes } from "node:crypto";
import { auth } from "@/src/auth";
import { getGitHubAppSlug } from "@/src/lib/github-app";
import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";

const INSTALL_STATE_COOKIE = "healix_github_install_state";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.redirect(new URL("/auth", request.url));
  }

  try {
    const installationId = new URL(request.url).searchParams.get("installation_id");
    if (installationId) {
      if (!/^[1-9]\d*$/.test(installationId)) {
        return NextResponse.redirect(new URL("/dashboard?github_error=installation_not_completed", request.url));
      }

      const ownedInstallation = await prisma.project.findFirst({
        where: {
          githubInstallationId: installationId,
          user: { email: session.user.email },
        },
        select: { id: true },
      });
      if (!ownedInstallation) {
        return NextResponse.redirect(new URL("/dashboard?github_error=installation_not_completed", request.url));
      }

      const state = randomBytes(32).toString("hex");
      const settingsUrl = new URL(`https://github.com/settings/installations/${installationId}`);
      const response = NextResponse.redirect(settingsUrl);
      response.cookies.set(INSTALL_STATE_COOKIE, state, {
        httpOnly: true,
        maxAge: 10 * 60,
        path: "/api/github/callback",
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
      });
      return response;
    }

    const appSlug = await getGitHubAppSlug();
    const state = randomBytes(32).toString("hex");
    const installationUrl = new URL(
      `https://github.com/apps/${encodeURIComponent(appSlug)}/installations/new`,
    );
    installationUrl.searchParams.set("state", state);

    const response = NextResponse.redirect(installationUrl);
    response.cookies.set(INSTALL_STATE_COOKIE, state, {
      httpOnly: true,
      maxAge: 10 * 60,
      path: "/api/github/callback",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });
    return response;
  } catch (error) {
    console.error("Could not start GitHub App installation.", error);
    return NextResponse.redirect(
      new URL("/dashboard?github_error=install_unavailable", request.url),
    );
  }
}
