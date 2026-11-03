"use server";

import { auth } from "@/src/auth";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { prisma } from "@/src/lib/prisma";
import { encryptProjectSecret } from "@/src/lib/project-secrets";
import { getInstallationRepository } from "@/src/lib/github-app";
import { z } from "zod";

const optionalUrl = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z.string().url().optional(),
);

const optionalText = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z.string().trim().optional(),
);

const optionalSecret = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z.string().trim().min(1).max(500).optional(),
);

const projectFormSchema = z.object({
  name: z.string().trim().min(1, "Enter a project name.").max(100),
  repoOwner: z.string().trim().min(1, "Enter the repository owner.").max(100).regex(/^[A-Za-z0-9_.-]+$/, "Use a valid GitHub owner name."),
  repoName: z.string().trim().min(1, "Enter the repository name.").max(100).regex(/^[A-Za-z0-9_.-]+$/, "Use a valid GitHub repository name."),
  githubToken: optionalSecret,
  githubInstallationId: z.string().regex(/^[1-9]\d*$/, "Connect a valid GitHub App installation.").optional(),
  defaultBranch: z.string().trim().min(1, "Enter a default branch.").max(255),
  deployedUrl: optionalUrl,
  deploymentProvider: z.enum(["NONE", "VERCEL", "RENDER", "CUSTOM"]),
  platformProjectId: optionalText,
  platformApiToken: optionalText,
  platformTeamId: optionalText,
  customWebhookUrl: optionalUrl,
}).superRefine((project, context) => {
  if (Boolean(project.githubToken) === Boolean(project.githubInstallationId)) {
    context.addIssue({
      code: "custom",
      path: ["githubInstallationId"],
      message: "Connect a GitHub App installation to continue.",
    });
  }

  if (project.deploymentProvider === "VERCEL" || project.deploymentProvider === "RENDER") {
    if (!project.platformProjectId) {
      context.addIssue({ code: "custom", path: ["platformProjectId"], message: "Enter the platform project ID." });
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
  githubInstallationId: string | null;
  deploymentProvider: "NONE" | "VERCEL" | "RENDER" | "CUSTOM";
  platformProjectId: string | null;
  hasPlatformApiToken: boolean;
  platformTeamId: string | null;
  customWebhookUrl: string | null;
  errorTrackingPrUrl: string | null;
  errorTrackingPrStatus: string | null;
};

export type UpdateProjectResult =
  | { success: true; project: DashboardProject }
  | { success: false; error: string };

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
    githubInstallationId: readFormString(formData, "githubInstallationId") || undefined,
    defaultBranch: readFormString(formData, "defaultBranch"),
    deployedUrl: readFormString(formData, "deployedUrl"),
    deploymentProvider: readFormString(formData, "deploymentProvider"),
    platformProjectId: readFormString(formData, "platformProjectId"),
    platformApiToken: readFormString(formData, "platformApiToken"),
    platformTeamId: readFormString(formData, "platformTeamId"),
    customWebhookUrl: readFormString(formData, "customWebhookUrl"),
  });

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Check the project details and try again." };
  }

  const data = parsed.data;
  try {
    if (data.githubInstallationId) {
      const cookieStore = await cookies();
      const pendingInstallationId = cookieStore.get("healix_pending_github_installation")?.value;
      const user = await prisma.user.findUnique({
        where: { email },
        select: { id: true },
      });
      const linkedInstallation = user && await prisma.project.findFirst({
        where: { userId: user.id, githubInstallationId: data.githubInstallationId },
        select: { id: true },
      });
      if (pendingInstallationId !== data.githubInstallationId && !linkedInstallation) {
        return { success: false, error: "Reconnect the GitHub App before registering this project." };
      }

      const repository = await getInstallationRepository(
        data.githubInstallationId,
        data.repoOwner,
        data.repoName,
      );
      if (
        repository.owner.login.toLowerCase() !== data.repoOwner.toLowerCase() ||
        repository.name.toLowerCase() !== data.repoName.toLowerCase() ||
        (repository.default_branch || "main") !== data.defaultBranch
      ) {
        return { success: false, error: "The selected repository details changed. Reconnect GitHub and choose the repository again." };
      }
    }

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
      return { success: false, error: "This repository is already registered as a project in your workspace." };
    }

    const encryptedPlatformToken = platformApiToken ? encryptProjectSecret(platformApiToken) : null;
    const project = await prisma.project.create({
      data: {
        name: data.name,
        repoOwner: data.repoOwner,
        repoName: data.repoName,
        defaultBranch: data.defaultBranch,
        deployedUrl: data.deployedUrl ?? null,
        githubToken: data.githubToken ? encryptProjectSecret(data.githubToken) : null,
        githubInstallationId: data.githubInstallationId ?? null,
        deploymentProvider: data.deploymentProvider,
        platformServiceId: data.deploymentProvider === "VERCEL" || data.deploymentProvider === "RENDER"
          ? data.platformProjectId
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
        githubInstallationId: true,
        deploymentProvider: true,
        platformServiceId: true,
        platformApiToken: true,
        platformTeamId: true,
        customWebhookUrl: true,
        apiKey: true,
      },
    });
    if (data.githubInstallationId) {
      const cookieStore = await cookies();
      if (cookieStore.get("healix_pending_github_installation")?.value === data.githubInstallationId) {
        cookieStore.set("healix_pending_github_installation", "", {
          httpOnly: true,
          maxAge: 0,
          path: "/",
          sameSite: "lax",
          secure: process.env.NODE_ENV === "production",
        });
      }
    }
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/projects");

    return {
      success: true,
      project: {
        id: project.id,
        name: project.name,
        repoOwner: project.repoOwner,
        repoName: project.repoName,
        defaultBranch: project.defaultBranch,
        deployedUrl: project.deployedUrl,
        githubInstallationId: project.githubInstallationId,
        deploymentProvider: project.deploymentProvider,
        platformProjectId: project.platformServiceId,
        hasPlatformApiToken: Boolean(project.platformApiToken),
        platformTeamId: project.platformTeamId,
        customWebhookUrl: project.customWebhookUrl,
        errorTrackingPrUrl: null,
        errorTrackingPrStatus: null,
      },
      webhookUrl: `/api/telemetry/ingest/${encodeURIComponent(project.apiKey)}`,
    };
  } catch (error) {
    console.error("Project registration failed while saving project settings.", error);
    return { success: false, error: "Project registration failed. Check your details and try again." };
  }
}

const projectUpdateSchema = z.object({
  name: z.string().trim().min(1, "Enter a project name.").max(100),
  repoOwner: z.string().trim().min(1, "Enter the repository owner.").max(100).regex(/^[A-Za-z0-9_.-]+$/, "Use a valid GitHub owner name."),
  repoName: z.string().trim().min(1, "Enter the repository name.").max(100).regex(/^[A-Za-z0-9_.-]+$/, "Use a valid GitHub repository name."),
  defaultBranch: z.string().trim().min(1, "Enter a default branch.").max(255),
  deployedUrl: optionalUrl,
  deploymentProvider: z.enum(["NONE", "VERCEL", "RENDER", "CUSTOM"]),
  platformProjectId: optionalText,
  platformApiToken: optionalSecret,
  platformTeamId: optionalText,
  customWebhookUrl: optionalUrl,
});

export async function updateProject(projectId: string, formData: FormData): Promise<UpdateProjectResult> {
  const email = (await auth())?.user?.email;
  if (!email) return { success: false, error: "Sign in again before editing a project." };

  const parsed = projectUpdateSchema.safeParse({
    name: readFormString(formData, "name"),
    repoOwner: readFormString(formData, "repoOwner"),
    repoName: readFormString(formData, "repoName"),
    defaultBranch: readFormString(formData, "defaultBranch"),
    deployedUrl: readFormString(formData, "deployedUrl"),
    deploymentProvider: readFormString(formData, "deploymentProvider"),
    platformProjectId: readFormString(formData, "platformProjectId"),
    platformApiToken: readFormString(formData, "platformApiToken"),
    platformTeamId: readFormString(formData, "platformTeamId"),
    customWebhookUrl: readFormString(formData, "customWebhookUrl"),
  });
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Check the project details and try again." };
  }

  try {
    const existingProject = await prisma.project.findFirst({
      where: { id: projectId, user: { email } },
      select: {
        id: true,
        repoOwner: true,
        repoName: true,
        deploymentProvider: true,
        platformApiToken: true,
      },
    });
    if (!existingProject) return { success: false, error: "Project not found in your workspace." };

    const usesPlatformCredentials =
      parsed.data.deploymentProvider === "VERCEL" || parsed.data.deploymentProvider === "RENDER";
    const canReusePlatformToken =
      parsed.data.deploymentProvider === existingProject.deploymentProvider &&
      Boolean(existingProject.platformApiToken);
    if (usesPlatformCredentials && !parsed.data.platformApiToken && !canReusePlatformToken) {
      return { success: false, error: `Enter the ${parsed.data.deploymentProvider === "VERCEL" ? "Vercel access token" : "Render API key"}.` };
    }
    if (usesPlatformCredentials && !parsed.data.platformProjectId) {
      return { success: false, error: "Enter the deployment provider project ID." };
    }
    if (parsed.data.deploymentProvider === "CUSTOM" && !parsed.data.customWebhookUrl) {
      return { success: false, error: "Enter the custom webhook URL." };
    }

    const duplicateRepository = await prisma.project.findFirst({
      where: {
        id: { not: projectId },
        user: { email },
        repoOwner: { equals: parsed.data.repoOwner, mode: "insensitive" },
        repoName: { equals: parsed.data.repoName, mode: "insensitive" },
      },
      select: { id: true },
    });
    if (duplicateRepository) {
      return { success: false, error: "This repository is already registered as another project." };
    }

    const project = await prisma.project.update({
      where: { id: projectId },
      data: {
        name: parsed.data.name,
        deployedUrl: parsed.data.deployedUrl ?? null,
        deploymentProvider: parsed.data.deploymentProvider,
        platformServiceId: usesPlatformCredentials ? parsed.data.platformProjectId : null,
        platformApiToken: usesPlatformCredentials
          ? parsed.data.platformApiToken
            ? encryptProjectSecret(parsed.data.platformApiToken)
            : undefined
          : null,
        platformTeamId: parsed.data.deploymentProvider === "VERCEL" ? parsed.data.platformTeamId ?? null : null,
        customWebhookUrl: parsed.data.deploymentProvider === "CUSTOM" ? parsed.data.customWebhookUrl ?? null : null,
      },
      select: {
        id: true,
        name: true,
        repoOwner: true,
        repoName: true,
        defaultBranch: true,
        deployedUrl: true,
        githubInstallationId: true,
        deploymentProvider: true,
        platformServiceId: true,
        platformTeamId: true,
        customWebhookUrl: true,
        errorTrackingPrUrl: true,
        errorTrackingPrStatus: true,
      },
    });
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/projects");
    return {
      success: true,
      project: {
        ...project,
        platformProjectId: project.platformServiceId,
        hasPlatformApiToken: usesPlatformCredentials && (
          Boolean(parsed.data.platformApiToken) || canReusePlatformToken
        ),
      },
    };
  } catch (error) {
    console.error(`Project ${projectId} could not be updated.`, error);
    return { success: false, error: "Unable to update this project. Please try again." };
  }
}

export async function deleteProject(projectId: string): Promise<{ success: true } | { success: false; error: string }> {
  const email = (await auth())?.user?.email;
  if (!email) return { success: false, error: "Sign in again before deleting a project." };

  try {
    const result = await prisma.project.deleteMany({
      where: { id: projectId, user: { email } },
    });
    if (result.count !== 1) return { success: false, error: "Project not found in your workspace." };
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/projects");
    revalidatePath("/dashboard/incidents");
    return { success: true };
  } catch (error) {
    console.error(`Project ${projectId} could not be deleted.`, error);
    return { success: false, error: "Unable to delete this project. Please try again." };
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

  return `/api/telemetry/ingest/${encodeURIComponent(project.apiKey)}`;
}
