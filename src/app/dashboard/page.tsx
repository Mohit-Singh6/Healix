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
  return (
    <DashboardView
      view="overview"
      {...data}
      initialGitHubError={query.github_error}
    />
  );
}
