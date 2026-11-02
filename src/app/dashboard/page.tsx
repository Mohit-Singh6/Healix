import DashboardView from "@/src/components/dashboard/DashboardView";
import { getDashboardData } from "./page-data";

export default async function DashboardPage() {
  const data = await getDashboardData();
  return <DashboardView view="overview" {...data} />;
}
