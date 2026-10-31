"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight, LogOut } from "lucide-react";
import { logOut } from "@/src/app/auth/actions";

type NavbarUser = {
  name?: string | null;
  email?: string | null;
  image?: string | null;
};

function Brand() {
  return (
    <Link href="/" aria-label="Healix home" className="shrink-0">
      <div className="flex items-center gap-2">
        <Image src="/Healix_Logo-clean.png" alt="" width={32} height={32} priority unoptimized className="size-8 object-contain" />
        <Image src="/Healix_Text_Logo.png" alt="Healix" width={57} height={32} priority unoptimized style={{ width: "auto" }} className="hidden h-8 w-auto object-contain sm:block" />
      </div>
    </Link>
  );
}

function OperatorMenu({ user }: { user: NavbarUser }) {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const displayName = user.name || user.email || "Healix operator";
  const initials = displayName
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        aria-label={`Open user menu for ${displayName}`}
        aria-expanded={isUserMenuOpen}
        onClick={() => setIsUserMenuOpen((open) => !open)}
        className="flex size-8 cursor-pointer items-center justify-center overflow-hidden rounded-full border border-[#33322C] bg-[#1E1E1B] font-mono text-xs font-medium leading-none text-[#EDEDE8] transition-colors hover:border-[#F59E0B]"
      >
        {user.image ? (
          <Image
            src={user.image}
            alt=""
            width={32}
            height={32}
            className="size-full object-cover"
          />
        ) : initials}
      </button>
      {isUserMenuOpen && (
        <div className="absolute right-0 top-full z-50 mt-2 w-64 rounded-lg border border-[#2B2A24] bg-[#181816] p-2 shadow-2xl">
          <div className="px-3 py-2">
            <p className="text-sm font-medium text-[#EDEDE8]">{displayName}</p>
            {user.email && <p className="mt-1 font-mono text-xs text-[#8A8A82]">{user.email}</p>}
            <p className="mt-2 font-mono text-[10px] uppercase tracking-wider text-[#F59E0B]">Operator</p>
          </div>
          <div className="my-1 border-t border-[#2B2A24]" />
          <form action={logOut}>
            <button
              type="submit"
              className="flex w-full items-center justify-between rounded px-3 py-2 text-left font-mono text-xs text-[#EDEDE8] transition-colors hover:bg-rose-950/10 hover:text-rose-200"
            >
              Log Out <LogOut aria-hidden="true" size={14} />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

function InternalLinks({ pathname }: { pathname: string }) {
  const links = [
    { label: "War Room", href: "/dashboard", active: pathname === "/dashboard" },
    { label: "Incidents", href: "/dashboard#incidents", active: pathname.startsWith("/incidents/") },
    { label: "Services", href: "/dashboard#projects", active: false },
    { label: "Docs", href: "/#architecture", active: false },
  ];

  return (
    <nav aria-label="Workspace navigation" className="flex min-w-0 items-center gap-1 overflow-x-auto max-sm:order-2 max-sm:w-full max-sm:max-w-full max-sm:flex-none sm:flex-1">
      {links.map((link) => (
        <Link
          key={link.label}
          href={link.href}
          className={`shrink-0 rounded px-3 py-1.5 text-sm font-medium transition-colors ${
            link.active ? "text-[#EDEDE8]" : "text-[#A1A19A] hover:text-[#EDEDE8]"
          }`}
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}

export default function Navbar({ user }: { user: NavbarUser | null }) {
  const pathname = usePathname();
  const isInternalRoute = pathname === "/dashboard" || pathname.startsWith("/incidents/");
  const showInternalNav = isInternalRoute || Boolean(user);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-[#232320] bg-[#121211]/90 backdrop-blur-md">
      <div className="mx-auto flex min-h-14 max-w-7xl flex-wrap items-center justify-between gap-y-1 px-6 py-2 sm:h-14 sm:flex-nowrap sm:py-0">
        <Brand />

        {showInternalNav ? (
          <div className="ml-auto flex min-w-0 flex-1 items-center justify-end gap-2 max-sm:ml-0 max-sm:flex-wrap max-sm:justify-between sm:ml-8 sm:gap-6">
            <InternalLinks pathname={pathname} />
            <div className="order-1 flex shrink-0 items-center gap-2 sm:order-none sm:gap-3">
              <Link
                href="/dashboard#projects"
                className="inline-flex items-center gap-1.5 rounded-md border border-[#33322C] bg-[#1E1E1B] px-3.5 py-1.5 font-mono text-xs text-[#EDEDE8] transition-all hover:border-[#F59E0B]/50 hover:bg-[#282723]"
              >
                <span aria-hidden="true">+</span> Add Project
              </Link>
              {user && <OperatorMenu user={user} />}
            </div>
          </div>
        ) : pathname === "/auth" ? null : (
          <div className="ml-auto flex items-center gap-5">
            <Link href="/#architecture" className="font-mono text-xs text-[#8A8A82] transition-colors hover:text-[#EDEDE8]">
              Docs
            </Link>
            <Link href="/#contact" className="font-mono text-xs text-[#8A8A82] transition-colors hover:text-[#EDEDE8]">
              Contact Us
            </Link>
            <Link
              href="/auth"
              className="inline-flex items-center gap-2 rounded-md bg-[#F59E0B] px-4 py-1.5 font-mono text-xs font-medium text-black transition-colors hover:bg-[#D97706]"
            >
              Get Started <ArrowRight aria-hidden="true" size={13} />
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}
