"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  Activity,
  ArrowUpRight,
  CircleUserRound,
  ShieldCheck,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const navigation = [
  { label: "Incidents", href: "/incidents" },
  { label: "Services", href: "/incidents#services" },
  { label: "Audit Log", href: "/incidents#audit-log" },
];

export function Navbar() {
  const pathname = usePathname();
  const [operatorActive, setOperatorActive] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-white/[0.07] bg-[#070c17]/85 backdrop-blur-xl">
      <div className="mx-auto flex min-h-16 w-full max-w-[1480px] flex-wrap items-center gap-x-2 gap-y-2 px-4 py-2 sm:flex-nowrap sm:gap-4 sm:px-6 sm:py-0 lg:px-8">
        <Link
          href="/incidents"
          className="group order-1 flex shrink-0 items-center gap-2.5 sm:order-none"
          aria-label="Healix incident command home"
        >
          <span className="relative grid size-9 place-items-center rounded-xl border border-cyan-400/25 bg-cyan-400/[0.08] shadow-[0_0_24px_rgba(6,182,212,0.12)]">
            <Activity className="size-[18px] text-cyan-300 transition group-hover:drop-shadow-[0_0_8px_rgba(103,232,249,0.8)]" />
            <span className="absolute -right-0.5 -top-0.5 size-2 rounded-full bg-cyan-300 shadow-[0_0_10px_rgba(103,232,249,0.9)]" />
          </span>
          <span className="text-[17px] font-semibold tracking-[-0.04em] text-slate-100">
            healix<span className="text-cyan-400">.</span>
          </span>
        </Link>

        <div         className="hidden items-center gap-2 rounded-full border border-emerald-400/15 bg-emerald-400/[0.06] px-3 py-1.5 text-[11px] text-emerald-200/90 lg:flex">
          <span className="relative flex size-1.5">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-60" />
            <span className="relative inline-flex size-1.5 rounded-full bg-emerald-400" />
          </span>
          <span>Worker active</span>
          <span className="text-emerald-200/35">·</span>
          <span className="font-mono text-emerald-100/70">3 streams listening</span>
        </div>

        <nav
          aria-label="Main navigation"
          className="order-3 ml-auto flex w-full items-center gap-0.5 overflow-x-auto sm:order-none sm:ml-0 sm:w-auto sm:gap-1"
        >
          {navigation.map((item) => {
            const active = item.href === "/incidents" && pathname.startsWith("/incidents");
            return (
              <Link
                key={item.label}
                href={item.href}
                className={cn(
                  "rounded-lg px-2.5 py-2 text-[12px] transition-colors sm:px-3 sm:text-[13px]",
                  active
                    ? "bg-white/[0.06] text-slate-100"
                    : "text-slate-400 hover:bg-white/[0.04] hover:text-slate-200"
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto hidden h-7 w-px bg-white/[0.08] sm:block" />

        <div className="order-2 ml-auto flex shrink-0 items-center gap-2 sm:order-none sm:ml-0">
          <Link
            href="/sign-in"
            className="hidden items-center gap-1 text-[12px] text-slate-400 transition hover:text-cyan-200 md:flex"
          >
            Sign in
            <ArrowUpRight className="size-3" />
          </Link>
          <button
            type="button"
            aria-pressed={operatorActive}
            aria-label={
              operatorActive
                ? "Switch to guest preview"
                : "Switch to active operator preview"
            }
            onClick={() => setOperatorActive((active) => !active)}
            className={cn(
              "flex items-center gap-2 rounded-full border px-2.5 py-1.5 text-left transition",
              operatorActive
                ? "border-cyan-400/25 bg-cyan-400/[0.08] text-cyan-100 hover:border-cyan-300/40"
                : "border-white/10 bg-white/[0.03] text-slate-300 hover:border-white/20 hover:bg-white/[0.06]"
            )}
          >
            <span
              className={cn(
                "grid size-7 place-items-center rounded-full",
                operatorActive
                  ? "bg-cyan-400/15 text-cyan-200"
                  : "bg-slate-700/70 text-slate-300"
              )}
            >
              {operatorActive ? (
                <ShieldCheck className="size-4" />
              ) : (
                <CircleUserRound className="size-4" />
              )}
            </span>
            <span className="hidden sm:block">
              <span className="block text-[11px] font-medium leading-4">
                {operatorActive ? "Active Operator" : "Guest Sign-In"}
              </span>
              <span className="block text-[10px] leading-3 text-slate-500">
                {operatorActive ? "Preview session" : "Developer preview"}
              </span>
            </span>
            {operatorActive && (
              <Badge className="hidden border-cyan-400/20 bg-cyan-400/10 px-1.5 text-[9px] text-cyan-200 lg:inline-flex">
                DEMO
              </Badge>
            )}
          </button>
        </div>
      </div>
      <div className="sr-only" aria-live="polite">
        {operatorActive ? "Active Operator preview enabled" : "Guest preview"}
      </div>
    </header>
  );
}
