import { randomBytes } from "node:crypto";
import { auth } from "@/src/auth";
import { getGitHubAppSlug } from "@/src/lib/github-app";
import { NextResponse } from "next/server";

const INSTALL_STATE_COOKIE = "healix_github_install_state";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.redirect(new URL("/auth", request.url));
  }

  try {
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
