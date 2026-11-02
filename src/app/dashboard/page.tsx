import DashboardView from "@/src/components/dashboard/DashboardView";
import { getDashboardData } from "./page-data";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{
    installation_id?: string;
    owner?: string;
    repo?: string;
    branch?: string;
    github_error?: string;
  }>;
}) {
  const data = await getDashboardData();
  const query = await searchParams;
  const connectedRepository =
    query.installation_id &&
    /^[1-9]\d*$/.test(query.installation_id) &&
    query.owner &&
    query.repo &&
    query.branch
      ? {
          installationId: query.installation_id,
          owner: query.owner,
          repo: query.repo,
          branch: query.branch,
        }
      : null;

  return (
    <DashboardView
      view="overview"
      {...data}
      initialConnectedRepository={connectedRepository}
      initialGitHubError={query.github_error}
    />
  );
}
