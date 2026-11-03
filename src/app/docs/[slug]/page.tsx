import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getDocPage } from "../docs-content";

const titles: Record<string, string> = {
  introduction: "Introduction to Healix",
  "connecting-projects": "Connecting Your Project & GitHub Setup",
  instrumentation: "Instrumenting Your App for Error Tracking",
  "incident-lifecycle": "Incident Lifecycle & Autonomous Fixes",
  "managing-projects": "Managing Multiple Projects & Team Permissions",
  "why-github-permissions": "Why GitHub Permissions Are Needed",
  "error-catching-works": "How Error Catching Works",
};

export function generateStaticParams() {
  return Object.keys(titles).map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const title = titles[slug];
  return title ? { title: `${title} | Healix Docs` } : {};
}

export default async function DocsSlugPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (slug === "connecting-services") redirect("/docs/connecting-projects");
  if (slug === "managing-services") redirect("/docs/managing-projects");
  return getDocPage(slug);
}
