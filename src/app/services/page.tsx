import DashboardView from "@/src/components/dashboard/DashboardView";
import { getDashboardData } from "@/src/app/dashboard/page-data";

export default async function ServicesPage() {
  const data = await getDashboardData();
  return <DashboardView view="services" {...data} />;
}
