"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  List,
  Menu,
  X,
} from "lucide-react";

const guidePages = [
  { slug: "introduction", title: "Introduction", href: "/docs/introduction" },
  { slug: "connecting-projects", title: "Connecting Your Project", href: "/docs/connecting-projects" },
  { slug: "instrumentation", title: "Instrumenting Your App", href: "/docs/instrumentation" },
  { slug: "incident-lifecycle", title: "Incident Lifecycle & Autonomous Fixes", href: "/docs/incident-lifecycle" },
  { slug: "managing-projects", title: "Managing Multiple Projects", href: "/docs/managing-projects" },
];

type TocItem = { id: string; title: string };

function NavigationLinks({ activePath }: { activePath: string }) {
  return (
    <nav aria-label="Documentation pages" className="flex flex-col gap-1">
      {guidePages.map((page, index) => {
        const active = activePath === page.href || (index === 0 && activePath === "/docs");
        return (
          <Link
            key={page.slug}
            href={page.href}
            aria-current={active ? "page" : undefined}
            className={`rounded-md px-3 py-2.5 text-sm transition-colors ${
              active
                ? "bg-[#1B1B18] font-medium text-[#EDEDE8] ring-1 ring-inset ring-[#2B2A24]"
                : "text-[#A1A19A] hover:bg-[#171715] hover:text-[#EDEDE8]"
            }`}
          >
            <span className="mr-2 font-mono text-[10px] text-[#77776F]">0{index + 1}</span>
            {page.title}
          </Link>
        );
      })}
    </nav>
  );
}

function TableOfContents({ items }: { items: TocItem[] }) {
  return (
    <nav aria-label="On this page" className="flex flex-col gap-2 border-l border-[#2B2A24] pl-3">
      {items.map((item) => (
        <a
          key={item.id}
          href={`#${item.id}`}
          className="text-sm text-[#8E8E86] transition-colors hover:text-[#EDEDE8]"
        >
          {item.title}
        </a>
      ))}
    </nav>
  );
}

function formatRelatedQuestion(title: string) {
  const cleaned = title.trim().replace(/[?]+$/g, "");
  return cleaned.startsWith("Q.") ? cleaned : `Q. ${cleaned}?`;
}

function PageLinkCard({
  href,
  direction,
  title,
}: {
  href?: string;
  direction: "previous" | "next";
  title: string;
}) {
  if (!href) return <div />;
  const isNext = direction === "next";
  return (
    <Link
      href={href}
      className={`group flex min-h-16 w-full max-w-80 flex-col justify-center gap-1 rounded-md border border-[#2B2A24] bg-[#111110] px-3 py-2.5 transition-colors hover:border-[#F59E0B]/50 hover:bg-[#171715] ${
        isNext ? "items-end justify-self-end text-right" : "items-start justify-self-start"
      }`}
    >
      <span className="flex items-center gap-1.5 font-mono text-[13px] normal-case text-[#8E8E86] group-hover:text-[#F59E0B]">
        {isNext ? "Next Page" : "Previous Page"}
        {isNext ? <ArrowRight aria-hidden="true" size={14} /> : <ArrowLeft aria-hidden="true" size={14} />}
      </span>
      <span className="text-[15px] font-medium text-[#EDEDE8]">{title}</span>
    </Link>
  );
}

export default function DocsPageFrame({
  slug,
  title,
  category,
  toc,
  related,
  children,
}: {
  slug: string;
  title: string;
  category: string;
  toc: TocItem[];
  related?: { title: string; href: string; description: string };
  children: ReactNode;
}) {
  const pathname = usePathname();
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState("");
  const [mobilePanel, setMobilePanel] = useState<"pages" | "toc" | null>(null);
  const guideIndex = guidePages.findIndex((page) => page.slug === slug);
  const isGuide = guideIndex >= 0;
  const previous = isGuide && guideIndex > 0 ? guidePages[guideIndex - 1] : undefined;
  const next = isGuide && guideIndex < guidePages.length - 1 ? guidePages[guideIndex + 1] : undefined;

  async function copyPageUrl() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setCopyError("");
      window.setTimeout(() => setCopied(false), 1800);
    } catch (error) {
      console.error("Unable to copy the documentation page URL.", error);
      setCopyError("Copy failed. You can copy the URL from your browser address bar.");
    }
  }

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-[#0A0A0A] text-[#EDEDE8]">
      <div className="mx-auto grid max-w-[1440px] grid-cols-1 gap-0 px-4 sm:px-6 lg:grid-cols-[230px_minmax(0,1fr)_220px] lg:gap-10 xl:grid-cols-[250px_minmax(0,1fr)_230px] xl:gap-14">
        <aside className="sticky top-14 hidden h-[calc(100vh-3.5rem)] overflow-y-auto border-r border-[#22221F] py-8 pr-4 lg:block">
          <Link href="/docs" className="mb-7 inline-flex items-center gap-2 text-lg font-semibold tracking-tight text-[#EDEDE8]">
            Healix Docs
          </Link>
          <NavigationLinks activePath={pathname} />
        </aside>

        <main className="min-w-0 pb-24 pt-5 sm:pt-8 lg:py-10">
          <div className="mb-5 flex items-center justify-between gap-3 lg:mb-8">
            <div className="flex min-w-0 items-center gap-2 text-xs text-[#8E8E86] sm:text-sm">
              <Link href="/docs" className="shrink-0 hover:text-[#EDEDE8]">Docs</Link>
              <ChevronRight aria-hidden="true" size={14} className="shrink-0 text-[#5F5F58]" />
              <span className="shrink-0">{category}</span>
              <ChevronRight aria-hidden="true" size={14} className="shrink-0 text-[#5F5F58]" />
              <span className="truncate text-[#C9C9C2]">{title}</span>
            </div>
            <button
              type="button"
              onClick={() => void copyPageUrl()}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-[#2B2A24] px-2.5 py-1.5 font-mono text-[11px] text-[#A1A19A] transition-colors hover:bg-[#171715] hover:text-[#EDEDE8] sm:px-3 sm:text-xs"
            >
              {copied ? <Check aria-hidden="true" size={13} /> : <Copy aria-hidden="true" size={13} />}
              <span className="hidden sm:inline">{copied ? "Copied" : "Copy page URL"}</span>
              <span className="sm:hidden">{copied ? "Copied" : "Copy URL"}</span>
            </button>
          </div>
          {copyError && <p role="status" className="mb-4 text-xs text-rose-300">{copyError}</p>}

          <div className="mb-7 flex items-center justify-between gap-3 border-y border-[#22221F] py-2.5 lg:mb-9 lg:border-0 lg:py-0">
            {previous ? (
              <Link href={previous.href} className="inline-flex items-center gap-1.5 text-sm text-[#A1A19A] transition-colors hover:text-[#EDEDE8]">
                <ChevronLeft aria-hidden="true" size={16} /> Previous
              </Link>
            ) : <span />}
            {next ? (
              <Link href={next.href} className="ml-auto inline-flex items-center gap-1.5 text-sm text-[#A1A19A] transition-colors hover:text-[#EDEDE8]">
                Next <ChevronRight aria-hidden="true" size={16} />
              </Link>
            ) : <span />}
          </div>

          <article className="docs-prose">
            <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.16em] text-[#F59E0B]">{category}</p>
            <h1 className="mb-6 text-3xl font-semibold tracking-tight text-[#F3F3EF] sm:text-4xl">{title}</h1>
            {children}
          </article>

          {isGuide && (
            <nav aria-label="Documentation page navigation" className="mt-12 grid gap-3 border-t border-[#22221F] pt-6 sm:grid-cols-2">
              <PageLinkCard href={previous?.href} direction="previous" title={previous?.title ?? ""} />
              {guideIndex === 0 && next ? (
                <Link
                  href={next.href}
                  className="group flex min-h-16 w-full max-w-80 flex-col items-end justify-center justify-self-end gap-1 rounded-md border border-[#F59E0B]/40 bg-[#F59E0B] px-3 py-2.5 text-right transition-colors hover:bg-[#D97706]"
                >
                  <span className="flex items-center gap-1.5 font-mono text-[13px] text-black/70">
                    Start setting up projects <ArrowRight aria-hidden="true" size={12} />
                  </span>
                  <span className="text-[15px] font-semibold text-black">Connecting Your Project</span>
                </Link>
              ) : (
                <PageLinkCard href={next?.href} direction="next" title={next?.title ?? ""} />
              )}
            </nav>
          )}

          {!isGuide && related && (
            <div className="mt-12 border-t border-[#22221F] pt-6">
              <Link href={related.href} className="text-sm text-[#A1A19A] transition-colors hover:text-[#F59E0B]">
                <span className="font-mono text-xs text-[#77776F]">Related guide</span>
                <span className="mt-1 block font-medium">{related.title} →</span>
              </Link>
            </div>
          )}
        </main>

        <aside className="sticky top-14 hidden h-[calc(100vh-3.5rem)] overflow-y-auto border-l border-[#22221F] py-10 pl-5 lg:block">
          <p className="mb-4 font-mono text-[10px] uppercase tracking-[0.16em] text-[#77776F]">On this page</p>
          <TableOfContents items={toc} />
          {related && (
            <div className="mt-9 border-t border-[#22221F] pt-5">
              <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.14em] text-[#77776F]">Related questions</p>
              <Link href={related.href} className="group block rounded-md border border-[#2B2A24] bg-[#111110] p-3 transition-colors hover:border-[#F59E0B]/40">
                <span className="block text-sm font-medium text-[#D4D4CE] group-hover:text-[#F59E0B]">{formatRelatedQuestion(related.title)}</span>
                <span className="mt-1.5 block text-xs leading-relaxed text-[#8E8E86]">{related.description}</span>
              </Link>
            </div>
          )}
        </aside>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 flex gap-2 border-t border-[#2B2A24] bg-[#0A0A0A]/95 p-3 backdrop-blur lg:hidden">
        <button
          type="button"
          onClick={() => setMobilePanel(mobilePanel === "pages" ? null : "pages")}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-md border border-[#2B2A24] px-3 py-2 text-sm text-[#D4D4CE]"
        >
          {mobilePanel === "pages" ? <X aria-hidden="true" size={16} /> : <Menu aria-hidden="true" size={16} />}
          Pages
        </button>
        <button
          type="button"
          onClick={() => setMobilePanel(mobilePanel === "toc" ? null : "toc")}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-md border border-[#2B2A24] px-3 py-2 text-sm text-[#D4D4CE]"
        >
          {mobilePanel === "toc" ? <X aria-hidden="true" size={16} /> : <List aria-hidden="true" size={16} />}
          On this page
        </button>
      </div>

      {mobilePanel && (
        <div className="fixed inset-0 z-40 bg-black/65 lg:hidden" onClick={() => setMobilePanel(null)}>
          <aside
            role="dialog"
            aria-modal="true"
            aria-label={mobilePanel === "pages" ? "Documentation" : "On this page"}
            className={`absolute inset-y-0 w-[min(88vw,360px)] overflow-y-auto border-[#2B2A24] bg-[#111110] p-5 shadow-2xl ${
              mobilePanel === "pages" ? "left-0 border-r" : "right-0 border-l"
            }`}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-6 flex items-center justify-between">
              <p className="font-mono text-xs uppercase tracking-wider text-[#8E8E86]">
                {mobilePanel === "pages" ? "Documentation" : "On this page"}
              </p>
              <button type="button" aria-label="Close navigation" onClick={() => setMobilePanel(null)} className="rounded p-1 text-[#A1A19A] hover:bg-[#22221F] hover:text-[#EDEDE8]">
                <X aria-hidden="true" size={18} />
              </button>
            </div>
            {mobilePanel === "pages" ? (
              <NavigationLinks activePath={pathname} />
            ) : (
              <TableOfContents items={toc} />
            )}
            {related && mobilePanel === "toc" && (
              <div className="mt-8 border-t border-[#2B2A24] pt-5">
                <p className="mb-3 font-mono text-[10px] uppercase tracking-wider text-[#77776F]">Related question</p>
                <Link href={related.href} onClick={() => setMobilePanel(null)} className="text-sm text-[#D4D4CE] hover:text-[#F59E0B]">
                  {formatRelatedQuestion(related.title)}
                </Link>
              </div>
            )}
          </aside>
        </div>
      )}
    </div>
  );
}
