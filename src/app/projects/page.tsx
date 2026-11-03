import DashboardView from "@/src/components/dashboard/DashboardView";
import { getDashboardData } from "@/src/app/dashboard/page-data";

export default async function ProjectsPage() {
  const data = await getDashboardData();
  return <DashboardView view="projects" {...data} />;
}
