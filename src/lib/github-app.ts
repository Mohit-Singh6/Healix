import { createAppAuth } from "@octokit/auth-app";
import { Octokit } from "@octokit/rest";
import { decryptProjectSecret } from "@/src/lib/project-secrets";

type ProjectGitHubCredentials = {
  githubToken: string | null;
  githubInstallationId: string | null;
};

function cleanPrivateKey(rawKey: string): string {
  let key = rawKey.trim();

  // Strip surrounding quotes if Vercel or .env added them
  if (
    (key.startsWith('"') && key.endsWith('"')) ||
    (key.startsWith("'") && key.endsWith("'"))
  ) {
    key = key.slice(1, -1);
  }

  // Convert literal escaped "\n" back to real newlines
  key = key.replace(/\\n/g, "\n").replace(/\\r/g, "");

  return key;
}

function getGitHubAppCredentials() {
  const appIdValue = process.env.GITHUB_APP_ID;
  const privateKeyValue = process.env.GITHUB_APP_PRIVATE_KEY;

  if (!appIdValue) {
    throw new Error("GITHUB_APP_ID must be configured to proceed.");
  }
  if (!privateKeyValue) {
    throw new Error("GITHUB_APP_PRIVATE_KEY is not configured.");
  }

  return {
    appId: appIdValue,
    privateKey: cleanPrivateKey(privateKeyValue),
  };
}

export function createProjectGitHubClient(
  credentials: ProjectGitHubCredentials,
): Octokit | null {
  if (credentials.githubToken) {
    return new Octokit({ auth: decryptProjectSecret(credentials.githubToken) });
  }

  if (!credentials.githubInstallationId) return null;

  return createInstallationGitHubClient(credentials.githubInstallationId);
}

export function createInstallationGitHubClient(installationIdValue: string): Octokit {
  const installationId = Number(installationIdValue);
  if (!Number.isSafeInteger(installationId) || installationId <= 0) {
    throw new Error("The stored GitHub App installation ID is invalid.");
  }

  return new Octokit({
    authStrategy: createAppAuth,
    auth: {
      ...getGitHubAppCredentials(),
      installationId,
    },
  });
}

export async function getGitHubAppSlug(): Promise<string> {
  const octokit = new Octokit({
    authStrategy: createAppAuth,
    auth: getGitHubAppCredentials(),
  });
  const { data: app } = await octokit.rest.apps.getAuthenticated();
  if (!app?.slug) throw new Error("The authenticated GitHub App does not expose an app slug.");
  return app.slug;
}

export async function listInstallationRepositories(installationId: string) {
  const octokit = createProjectGitHubClient({
    githubToken: null,
    githubInstallationId: installationId,
  });
  if (!octokit) throw new Error("A GitHub App installation ID is required.");

  return octokit.paginate(
    octokit.rest.apps.listReposAccessibleToInstallation,
    { per_page: 100 },
  );
}

export async function getInstallationRepository(
  installationId: string,
  owner: string,
  repo: string,
) {
  const octokit = createProjectGitHubClient({
    githubToken: null,
    githubInstallationId: installationId,
  });
  if (!octokit) throw new Error("A GitHub App installation ID is required.");

  const { data } = await octokit.rest.repos.get({ owner, repo });
  return data;
}
