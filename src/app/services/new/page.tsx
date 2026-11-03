import { redirect } from "next/navigation";

export default async function LegacyNewProjectPage({
  searchParams,
}: {
  searchParams: Promise<{
    installation_id?: string;
    owner?: string;
    repo?: string;
    branch?: string;
  }>;
}) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(await searchParams)) {
    if (value) query.set(key, value);
  }
  const queryString = query.toString();
  redirect(queryString ? `/projects/new?${queryString}` : "/projects/new");
}
