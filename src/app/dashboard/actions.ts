"use server";

import { auth } from "@/src/auth";
import { prisma } from "@/src/lib/prisma";
import { encryptProjectSecret } from "@/src/lib/project-secrets";
import { z } from "zod";

const optionalUrl = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z.string().url().optional(),
);

const optionalText = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z.string().trim().optional(),
);

const projectFormSchema = z.object({
  name: z.string().trim().min(1, "Enter a project name.").max(100),
  repoOwner: z.string().trim().min(1, "Enter the repository owner.").max(100).regex(/^[A-Za-z0-9_.-]+$/, "Use a valid GitHub owner name."),
  repoName: z.string().trim().min(1, "Enter the repository name.").max(100).regex(/^[A-Za-z0-9_.-]+$/, "Use a valid GitHub repository name."),
  githubToken: z.string().trim().min(1, "Enter a GitHub personal access token.").max(500),
  defaultBranch: z.string().trim().min(1, "Enter a default branch.").max(255),
  deployedUrl: optionalUrl,
  deploymentProvider: z.enum(["NONE", "VERCEL", "RENDER", "CUSTOM"]),
  platformServiceId: optionalText,
  platformApiToken: optionalText,
  platformTeamId: optionalText,
  customWebhookUrl: optionalUrl,
}).superRefine((project, context) => {
  if (project.deploymentProvider === "VERCEL" || project.deploymentProvider === "RENDER") {
    if (!project.platformServiceId) {
      context.addIssue({ code: "custom", path: ["platformServiceId"], message: "Enter the platform service ID." });
    }
    if (!project.platformApiToken) {
      context.addIssue({ code: "custom", path: ["platformApiToken"], message: "Enter the platform API token." });
    }
  }

  if (project.deploymentProvider === "CUSTOM" && !project.customWebhookUrl) {
    context.addIssue({ code: "custom", path: ["customWebhookUrl"], message: "Enter the custom webhook URL." });
  }
});

export type CreateProjectResult =
  | { success: true; project: DashboardProject; webhookUrl: string }
  | { success: false; error: string };

export type DashboardProject = {
  id: string;
  name: string;
  repoOwner: string;
  repoName: string;
  defaultBranch: string;
  deployedUrl: string | null;
};

function readFormString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

export async function createProject(formData: FormData): Promise<CreateProjectResult> {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) return { success: false, error: "Sign in again before registering a project." };

  const parsed = projectFormSchema.safeParse({
    name: readFormString(formData, "name"),
    repoOwner: readFormString(formData, "repoOwner"),
    repoName: readFormString(formData, "repoName"),
    githubToken: readFormString(formData, "githubToken"),
    defaultBranch: readFormString(formData, "defaultBranch"),
    deployedUrl: readFormString(formData, "deployedUrl"),
    deploymentProvider: readFormString(formData, "deploymentProvider"),
    platformServiceId: readFormString(formData, "platformServiceId"),
    platformApiToken: readFormString(formData, "platformApiToken"),
    platformTeamId: readFormString(formData, "platformTeamId"),
    customWebhookUrl: readFormString(formData, "customWebhookUrl"),
  });

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Check the project details and try again." };
  }

  const data = parsed.data;
  try {
    const user = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (!user) return { success: false, error: "Your account could not be found. Sign out and sign in again." };

    const usesDeploymentCredentials = data.deploymentProvider === "VERCEL" || data.deploymentProvider === "RENDER";
    const platformApiToken = usesDeploymentCredentials ? data.platformApiToken : undefined;
    if (usesDeploymentCredentials && !platformApiToken) {
      return { success: false, error: "Enter the deployment provider API token." };
    }

    const existingProject = await prisma.project.findFirst({
      where: {
        userId: user.id,
        repoOwner: { equals: data.repoOwner, mode: "insensitive" },
        repoName: { equals: data.repoName, mode: "insensitive" },
      },
      select: { id: true },
    });

    if (existingProject) {
      return { success: false, error: "This repository is already registered in your workspace." };
    }

    const encryptedPlatformToken = platformApiToken ? encryptProjectSecret(platformApiToken) : null;
    const project = await prisma.project.create({
      data: {
        name: data.name,
        repoOwner: data.repoOwner,
        repoName: data.repoName,
        defaultBranch: data.defaultBranch,
        deployedUrl: data.deployedUrl ?? null,
        githubToken: encryptProjectSecret(data.githubToken),
        deploymentProvider: data.deploymentProvider,
        platformServiceId: data.deploymentProvider === "VERCEL" || data.deploymentProvider === "RENDER"
          ? data.platformServiceId
          : null,
        platformApiToken: encryptedPlatformToken,
        platformTeamId: data.deploymentProvider === "VERCEL" ? data.platformTeamId ?? null : null,
        customWebhookUrl: data.deploymentProvider === "CUSTOM" ? data.customWebhookUrl ?? null : null,
        userId: user.id,
      },
      select: {
        id: true,
        name: true,
        repoOwner: true,
        repoName: true,
        defaultBranch: true,
        deployedUrl: true,
        apiKey: true,
      },
    });

    return {
      success: true,
      project: {
        id: project.id,
        name: project.name,
        repoOwner: project.repoOwner,
        repoName: project.repoName,
        defaultBranch: project.defaultBranch,
        deployedUrl: project.deployedUrl,
      },
      webhookUrl: `/api/incidents/webhook?apiKey=${encodeURIComponent(project.apiKey)}`,
    };
  } catch (error) {
    console.error("Project registration failed while saving project settings.", error);
    return { success: false, error: "Project registration failed. Check your details and try again." };
  }
}

export async function getProjectWebhookUrl(projectId: string): Promise<string> {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) throw new Error("Sign in again before copying a project webhook URL.");

  const project = await prisma.project.findFirst({
    where: { id: projectId, user: { email } },
    select: { apiKey: true },
  });
  if (!project) throw new Error("Project not found in your workspace.");

  return `/api/incidents/webhook?apiKey=${encodeURIComponent(project.apiKey)}`;
}
