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

const serviceFormSchema = z.object({
  name: z.string().trim().min(1, "Enter a service name.").max(100),
  repoOwner: z.string().trim().min(1, "Enter the repository owner.").max(100).regex(/^[A-Za-z0-9_.-]+$/, "Use a valid GitHub owner name."),
  repoName: z.string().trim().min(1, "Enter the repository name.").max(100).regex(/^[A-Za-z0-9_.-]+$/, "Use a valid GitHub repository name."),
  githubToken: optionalSecret,
  githubInstallationId: z.string().regex(/^[1-9]\d*$/, "Connect a valid GitHub App installation.").optional(),
  defaultBranch: z.string().trim().min(1, "Enter a default branch.").max(255),
  deployedUrl: optionalUrl,
  deploymentProvider: z.enum(["NONE", "VERCEL", "RENDER", "CUSTOM"]),
  platformServiceId: optionalText,
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

export type CreateServiceResult =
  | { success: true; service: DashboardService; webhookUrl: string }
  | { success: false; error: string };

export type DashboardService = {
  id: string;
  name: string;
  repoOwner: string;
  repoName: string;
  defaultBranch: string;
  deployedUrl: string | null;
  githubInstallationId: string | null;
  deploymentProvider: "NONE" | "VERCEL" | "RENDER" | "CUSTOM";
  platformServiceId: string | null;
  hasPlatformApiToken: boolean;
  platformTeamId: string | null;
  customWebhookUrl: string | null;
  errorTrackingPrUrl: string | null;
  errorTrackingPrStatus: string | null;
};

export type UpdateServiceResult =
  | { success: true; service: DashboardService }
  | { success: false; error: string };

function readFormString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

export async function createService(formData: FormData): Promise<CreateServiceResult> {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) return { success: false, error: "Sign in again before registering a service." };

  const parsed = serviceFormSchema.safeParse({
    name: readFormString(formData, "name"),
    repoOwner: readFormString(formData, "repoOwner"),
    repoName: readFormString(formData, "repoName"),
    githubToken: readFormString(formData, "githubToken"),
    githubInstallationId: readFormString(formData, "githubInstallationId") || undefined,
    defaultBranch: readFormString(formData, "defaultBranch"),
    deployedUrl: readFormString(formData, "deployedUrl"),
    deploymentProvider: readFormString(formData, "deploymentProvider"),
    platformServiceId: readFormString(formData, "platformServiceId"),
    platformApiToken: readFormString(formData, "platformApiToken"),
    platformTeamId: readFormString(formData, "platformTeamId"),
    customWebhookUrl: readFormString(formData, "customWebhookUrl"),
  });

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Check the service details and try again." };
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
        return { success: false, error: "Reconnect the GitHub App before registering this service." };
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

    const existingService = await prisma.project.findFirst({
      where: {
        userId: user.id,
        repoOwner: { equals: data.repoOwner, mode: "insensitive" },
        repoName: { equals: data.repoName, mode: "insensitive" },
      },
      select: { id: true },
    });

    if (existingService) {
      return { success: false, error: "This repository is already registered as a service in your workspace." };
    }

    const encryptedPlatformToken = platformApiToken ? encryptProjectSecret(platformApiToken) : null;
    const service = await prisma.project.create({
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
    revalidatePath("/dashboard/services");

    return {
      success: true,
      service: {
        id: service.id,
        name: service.name,
        repoOwner: service.repoOwner,
        repoName: service.repoName,
        defaultBranch: service.defaultBranch,
        deployedUrl: service.deployedUrl,
        githubInstallationId: service.githubInstallationId,
        deploymentProvider: service.deploymentProvider,
        platformServiceId: service.platformServiceId,
        hasPlatformApiToken: Boolean(service.platformApiToken),
        platformTeamId: service.platformTeamId,
        customWebhookUrl: service.customWebhookUrl,
        errorTrackingPrUrl: null,
        errorTrackingPrStatus: null,
      },
      webhookUrl: `/api/telemetry/ingest/${encodeURIComponent(service.apiKey)}`,
    };
  } catch (error) {
    console.error("Service registration failed while saving service settings.", error);
    return { success: false, error: "Service registration failed. Check your details and try again." };
  }
}

const serviceUpdateSchema = z.object({
  name: z.string().trim().min(1, "Enter a service name.").max(100),
  repoOwner: z.string().trim().min(1, "Enter the repository owner.").max(100).regex(/^[A-Za-z0-9_.-]+$/, "Use a valid GitHub owner name."),
  repoName: z.string().trim().min(1, "Enter the repository name.").max(100).regex(/^[A-Za-z0-9_.-]+$/, "Use a valid GitHub repository name."),
  defaultBranch: z.string().trim().min(1, "Enter a default branch.").max(255),
  deployedUrl: optionalUrl,
  deploymentProvider: z.enum(["NONE", "VERCEL", "RENDER", "CUSTOM"]),
  platformServiceId: optionalText,
  platformApiToken: optionalSecret,
  platformTeamId: optionalText,
  customWebhookUrl: optionalUrl,
});

export async function updateService(serviceId: string, formData: FormData): Promise<UpdateServiceResult> {
  const email = (await auth())?.user?.email;
  if (!email) return { success: false, error: "Sign in again before editing a service." };

  const parsed = serviceUpdateSchema.safeParse({
    name: readFormString(formData, "name"),
    repoOwner: readFormString(formData, "repoOwner"),
    repoName: readFormString(formData, "repoName"),
    defaultBranch: readFormString(formData, "defaultBranch"),
    deployedUrl: readFormString(formData, "deployedUrl"),
    deploymentProvider: readFormString(formData, "deploymentProvider"),
    platformServiceId: readFormString(formData, "platformServiceId"),
    platformApiToken: readFormString(formData, "platformApiToken"),
    platformTeamId: readFormString(formData, "platformTeamId"),
    customWebhookUrl: readFormString(formData, "customWebhookUrl"),
  });
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Check the service details and try again." };
  }

  try {
    const existingService = await prisma.project.findFirst({
      where: { id: serviceId, user: { email } },
      select: {
        id: true,
        repoOwner: true,
        repoName: true,
        deploymentProvider: true,
        platformApiToken: true,
      },
    });
    if (!existingService) return { success: false, error: "Service not found in your workspace." };

    const usesPlatformCredentials =
      parsed.data.deploymentProvider === "VERCEL" || parsed.data.deploymentProvider === "RENDER";
    const canReusePlatformToken =
      parsed.data.deploymentProvider === existingService.deploymentProvider &&
      Boolean(existingService.platformApiToken);
    if (usesPlatformCredentials && !parsed.data.platformApiToken && !canReusePlatformToken) {
      return { success: false, error: `Enter the ${parsed.data.deploymentProvider === "VERCEL" ? "Vercel access token" : "Render API key"}.` };
    }
    if (usesPlatformCredentials && !parsed.data.platformServiceId) {
      return { success: false, error: "Enter the deployment provider service ID." };
    }
    if (parsed.data.deploymentProvider === "CUSTOM" && !parsed.data.customWebhookUrl) {
      return { success: false, error: "Enter the custom webhook URL." };
    }

    const duplicateRepository = await prisma.project.findFirst({
      where: {
        id: { not: serviceId },
        user: { email },
        repoOwner: { equals: parsed.data.repoOwner, mode: "insensitive" },
        repoName: { equals: parsed.data.repoName, mode: "insensitive" },
      },
      select: { id: true },
    });
    if (duplicateRepository) {
      return { success: false, error: "This repository is already registered as another service." };
    }

    const service = await prisma.project.update({
      where: { id: serviceId },
      data: {
        name: parsed.data.name,
        deployedUrl: parsed.data.deployedUrl ?? null,
        deploymentProvider: parsed.data.deploymentProvider,
        platformServiceId: usesPlatformCredentials ? parsed.data.platformServiceId : null,
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
    revalidatePath("/dashboard/services");
    return {
      success: true,
      service: {
        ...service,
        hasPlatformApiToken: usesPlatformCredentials && (
          Boolean(parsed.data.platformApiToken) || canReusePlatformToken
        ),
      },
    };
  } catch (error) {
    console.error(`Service ${serviceId} could not be updated.`, error);
    return { success: false, error: "Unable to update this service. Please try again." };
  }
}

export async function deleteService(serviceId: string): Promise<{ success: true } | { success: false; error: string }> {
  const email = (await auth())?.user?.email;
  if (!email) return { success: false, error: "Sign in again before deleting a service." };

  try {
    const result = await prisma.project.deleteMany({
      where: { id: serviceId, user: { email } },
    });
    if (result.count !== 1) return { success: false, error: "Service not found in your workspace." };
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/services");
    revalidatePath("/dashboard/incidents");
    return { success: true };
  } catch (error) {
    console.error(`Service ${serviceId} could not be deleted.`, error);
    return { success: false, error: "Unable to delete this service. Please try again." };
  }
}

export async function getServiceWebhookUrl(serviceId: string): Promise<string> {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) throw new Error("Sign in again before copying a service webhook URL.");

  const service = await prisma.project.findFirst({
    where: { id: serviceId, user: { email } },
    select: { apiKey: true },
  });
  if (!service) throw new Error("Service not found in your workspace.");

  return `/api/telemetry/ingest/${encodeURIComponent(service.apiKey)}`;
}
