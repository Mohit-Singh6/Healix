"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight } from "lucide-react";

function Brand() {
  return (
    <Link href="/" aria-label="Healix home">
      <div className="flex items-center gap-2">
        <Image src="/Healix_Logo-clean.png" alt="" width={30} height={30} priority unoptimized className="h-8 w-auto object-contain" />
        <Image src="/Healix_Text_Logo.png" alt="Healix" width={60} height={28} priority unoptimized className="h-8 w-auto object-contain" />
      </div>
    </Link>
  );
}

function InternalHeader({ pathname }: { pathname: string }) {
  const isIncident = pathname.startsWith("/incidents/");
  const [section, page] = isIncident
    ? ["incidents", pathname.split("/")[2] ?? "INCIDENT"]
    : ["workspace", "war-room"];

  return (
    <header className="sticky top-0 z-40 border-b border-[#2B2A24] bg-[#121211]">
      <nav
        aria-label="Workspace navigation"
        className="mx-auto flex min-h-16 max-w-[1600px] flex-wrap items-center gap-x-6 gap-y-3 px-5 py-3 sm:px-8 lg:px-12"
      >
        <Brand />
        <span aria-hidden="true" className="hidden h-6 w-px bg-[#2B2A24] sm:block" />
        <p className="font-mono text-xs text-[#8A8A82]">
          <span className="text-[#EDEDE8]">{section}</span>
          <span className="px-2 text-[#55554F]">/</span>
          <span>{page}</span>
        </p>
        <div className="ml-auto flex items-center gap-3 sm:gap-5">
          <span className="inline-flex items-center gap-2 font-mono text-[11px] text-[#A1A19A]">
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-40" />
              <span className="relative inline-flex size-2 rounded-full bg-emerald-400" />
            </span>
            <span className="hidden sm:inline">engine active</span>
          </span>
          <span aria-label="Operator MS" className="flex size-8 items-center justify-center rounded-full border border-[#F59E0B]/40 bg-[#1B1B18] font-mono text-xs text-[#EDEDE8]">
            MS
          </span>
        </div>
      </nav>
    </header>
  );
}

export default function Navbar() {
  const pathname = usePathname();

  if (pathname === "/dashboard" || pathname.startsWith("/incidents/")) {
    return <InternalHeader pathname={pathname} />;
  }

  if (pathname === "/auth") {
    return (
      <header className="border-b border-[#2B2A24] bg-[#121211]">
        <nav aria-label="Auth navigation" className="mx-auto flex min-h-16 max-w-7xl items-center px-5 sm:px-8 lg:px-12">
          <Brand />
        </nav>
      </header>
    );
  }

  return (
    <header className="sticky top-0 z-40 border-b border-[#2B2A24] bg-[#121211]">
      <nav
        aria-label="Main navigation"
        className="mx-auto flex min-h-16 max-w-[1440px] flex-wrap items-center justify-between gap-x-6 gap-y-3 px-5 py-3 sm:px-8 lg:px-12"
      >
        <Brand />
        <div className="ml-auto flex items-center gap-5 sm:gap-8">
          <Link href="/#architecture" className="text-sm text-[#A1A19A] transition-colors hover:text-[#E2E2DC]">
            Docs
          </Link>
          <Link href="/#contact" className="text-sm text-[#A1A19A] transition-colors hover:text-[#E2E2DC]">
            Contact Us
          </Link>
          <Link
            href="/auth"
            className="inline-flex items-center gap-2 rounded-md bg-[#F59E0B] px-5 py-2 font-medium text-black transition-colors hover:bg-[#D97706] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F59E0B]"
          >
            Get Started <ArrowRight aria-hidden="true" size={16} />
          </Link>
        </div>
      </nav>
    </header>
  );
}
