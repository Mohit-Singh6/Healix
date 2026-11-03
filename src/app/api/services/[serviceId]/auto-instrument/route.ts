import { auth } from "@/src/auth";
import { prisma } from "@/src/lib/prisma";
import { createInstallationGitHubClient } from "@/src/lib/github-app";
import { createErrorTrackingPullRequest } from "@/src/lib/error-tracking-pr";
import { NextResponse } from "next/server";

type RouteContext = {
  params: Promise<{ serviceId: string }>;
};

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return "Could not create the error-tracking pull request. Try again.";
}

export async function POST(_request: Request, { params }: RouteContext) {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) {
    return NextResponse.json({ success: false, error: "Sign in again before setting up error tracking." }, { status: 401 });
  }

  const { serviceId } = await params;
  const service = await prisma.project.findFirst({
    where: { id: serviceId, user: { email } },
    select: {
      id: true,
      name: true,
      repoOwner: true,
      repoName: true,
      defaultBranch: true,
      apiKey: true,
      githubInstallationId: true,
      errorTrackingPrUrl: true,
      errorTrackingPrStatus: true,
      updatedAt: true,
    },
  });
  if (!service) {
    return NextResponse.json({ success: false, error: "Service not found in your workspace." }, { status: 404 });
  }
  if (service.errorTrackingPrUrl) {
    return NextResponse.json({
      success: true,
      prUrl: service.errorTrackingPrUrl,
      status: service.errorTrackingPrStatus ?? "OPEN",
    });
  }
  if (
    service.errorTrackingPrStatus === "ANALYZING" &&
    Date.now() - service.updatedAt.getTime() < 10 * 60 * 1000
  ) {
    return NextResponse.json(
      { success: false, error: "Repository analysis is already running for this service." },
      { status: 409 },
    );
  }
  if (!service.githubInstallationId) {
    return NextResponse.json({
      success: false,
      error: "This service is not connected through a GitHub App installation. Reconnect its repository before automating setup.",
    }, { status: 409 });
  }

  try {
    await prisma.project.update({
      where: { id: service.id },
      data: { errorTrackingPrStatus: "ANALYZING" },
    });
    const octokit = createInstallationGitHubClient(service.githubInstallationId);

    const pullRequest = await createErrorTrackingPullRequest({
      octokit,
      owner: service.repoOwner,
      repo: service.repoName,
      defaultBranch: service.defaultBranch,
      serviceName: service.name,
      webhookUrl: new URL(
        `/api/telemetry/ingest/${encodeURIComponent(service.apiKey)}`,
        "https://healix.mohits.site",
      ).toString(),
    });

    await prisma.project.update({
      where: { id: service.id },
      data: {
        errorTrackingPrUrl: pullRequest.html_url,
        errorTrackingPrStatus: "OPEN",
      },
    });

    return NextResponse.json({
      success: true,
      prUrl: pullRequest.html_url,
      status: "OPEN",
    });
  } catch (error) {
    console.error(`Automatic error-tracking PR creation failed for service ${service.id}.`, error);
    try {
      await prisma.project.update({
        where: { id: service.id },
        data: { errorTrackingPrStatus: "FAILED" },
      });
    } catch (statusError) {
      console.error(`Could not persist failed error-tracking setup status for service ${service.id}.`, statusError);
    }
    return NextResponse.json(
      { success: false, error: errorMessage(error) },
      { status: 500 },
    );
  }
}
