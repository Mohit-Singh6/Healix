import { redirect } from "next/navigation";

export default async function LegacySelectRepositoryPage({
  searchParams,
}: {
  searchParams: Promise<{ installation_id?: string }>;
}) {
  const { installation_id: installationId } = await searchParams;
  const query = installationId ? `?installation_id=${encodeURIComponent(installationId)}` : "";
  redirect(`/projects/new/select-repo${query}`);
}
