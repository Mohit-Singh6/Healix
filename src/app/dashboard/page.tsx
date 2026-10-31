import DashboardView from "@/src/components/dashboard/DashboardView";
import { auth } from "@/src/auth";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/auth");

  return <DashboardView />;
}
