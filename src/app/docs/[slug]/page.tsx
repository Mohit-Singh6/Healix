import type { Metadata } from "next";
import { getDocPage } from "../docs-content";

const titles: Record<string, string> = {
  introduction: "Introduction to Healix",
  "connecting-services": "Connecting Your Service & GitHub Setup",
  instrumentation: "Instrumenting Your App for Error Tracking",
  "incident-lifecycle": "Incident Lifecycle & Autonomous Fixes",
  "managing-services": "Managing Multiple Services & Team Permissions",
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
  return getDocPage(slug);
}
