import DashboardView from "@/src/components/dashboard/DashboardView";
import { getDashboardData } from "../page-data";

export default async function IncidentsPage() {
  const data = await getDashboardData();
  return <DashboardView view="incidents" {...data} />;
}
