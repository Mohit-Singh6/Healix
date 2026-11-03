import { auth } from "@/src/auth";
import { prisma } from "@/src/lib/prisma";
import { createInstallationGitHubClient } from "@/src/lib/github-app";
import { createErrorTrackingPullRequest } from "@/src/lib/error-tracking-pr";
import { NextResponse } from "next/server";

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return "Could not create the error-tracking pull request. Try again.";
}

export async function handleAutoInstrument(projectId: string) {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) {
    return NextResponse.json({ success: false, error: "Sign in again before setting up error tracking." }, { status: 401 });
  }

  const project = await prisma.project.findFirst({
    where: { id: projectId, user: { email } },
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
  if (!project) {
    return NextResponse.json({ success: false, error: "Project not found in your workspace." }, { status: 404 });
  }
  if (project.errorTrackingPrUrl) {
    return NextResponse.json({
      success: true,
      prUrl: project.errorTrackingPrUrl,
      status: project.errorTrackingPrStatus ?? "OPEN",
    });
  }
  if (
    project.errorTrackingPrStatus === "ANALYZING" &&
    Date.now() - project.updatedAt.getTime() < 10 * 60 * 1000
  ) {
    return NextResponse.json(
      { success: false, error: "Repository analysis is already running for this project." },
      { status: 409 },
    );
  }
  if (!project.githubInstallationId) {
    return NextResponse.json({
      success: false,
      error: "This project is not connected through a GitHub App installation. Reconnect its repository before automating setup.",
    }, { status: 409 });
  }

  try {
    await prisma.project.update({
      where: { id: project.id },
      data: { errorTrackingPrStatus: "ANALYZING" },
    });
    const octokit = createInstallationGitHubClient(project.githubInstallationId);

    const pullRequest = await createErrorTrackingPullRequest({
      octokit,
      owner: project.repoOwner,
      repo: project.repoName,
      defaultBranch: project.defaultBranch,
      serviceName: project.name,
      webhookUrl: new URL(
        `/api/telemetry/ingest/${encodeURIComponent(project.apiKey)}`,
        "https://healix.mohits.site",
      ).toString(),
    });

    await prisma.project.update({
      where: { id: project.id },
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
    console.error(`Automatic error-tracking PR creation failed for project ${project.id}.`, error);
    try {
      await prisma.project.update({
        where: { id: project.id },
        data: { errorTrackingPrStatus: "FAILED" },
      });
    } catch (statusError) {
      console.error(`Could not persist failed error-tracking setup status for project ${project.id}.`, statusError);
    }
    return NextResponse.json(
      { success: false, error: errorMessage(error) },
      { status: 500 },
    );
  }
}
