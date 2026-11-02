import { createAppAuth } from "@octokit/auth-app";
import { Octokit } from "@octokit/rest";
import { decryptProjectSecret } from "@/src/lib/project-secrets";

type ProjectGitHubCredentials = {
  githubToken: string | null;
  githubInstallationId: string | null;
};

function getGitHubAppCredentials() {
  const clientId = process.env.GITHUB_CLIENT_ID;
  const privateKeyValue = process.env.GITHUB_APP_PRIVATE_KEY;

  if (!clientId) {
    throw new Error("GITHUB_CLIENT_ID must be configured to proceed.");
  }
  if (!privateKeyValue) {
    throw new Error("GITHUB_APP_PRIVATE_KEY is not configured.");
  }

  return {
    clientId: clientId,
    privateKey: privateKeyValue.replace(/\\n/g, "\n"),
  };
}

export function createProjectGitHubClient(
  credentials: ProjectGitHubCredentials,
): Octokit | null {
  if (credentials.githubToken) {
    return new Octokit({ auth: decryptProjectSecret(credentials.githubToken) });
  }

  if (!credentials.githubInstallationId) return null;

  const installationId = Number(credentials.githubInstallationId);
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
