"use client";

import Link from "next/link";

export default function NotFound() {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[#121211] p-6 pb-10 pr-10 text-[#EDEDE8] select-none">
      <span
        aria-hidden="true"
        className="pointer-events-none absolute select-none font-mono text-[15rem] font-bold leading-none tracking-tighter text-[#EDEDE8]/9 md:text-[30rem]"
      >
        404
      </span>

      <div className="relative z-10 mx-auto max-w-md space-y-4 text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-[#EDEDE8] md:text-5xl">
          Page not found
        </h1>
        <p className="text-sm leading-relaxed text-[#A1A19A] md:text-base">
          The page you requested is outside the active route manifest.
        </p>
        <div className="flex items-center justify-center gap-4 pt-4">
          <Link
            href="/dashboard"
            className="rounded-md bg-[#F59E0B] px-5 py-2.5 font-mono text-xs font-semibold text-black shadow-[0_1px_12px_rgba(245,158,11,0.2)] transition-all hover:bg-[#D97706] md:text-sm"
          >
            Return to War Room
          </Link>
          <button
            type="button"
            onClick={() => window.history.back()}
            className="px-3 py-2.5 font-mono text-xs text-[#A1A19A] transition-colors hover:text-[#EDEDE8] md:text-sm"
          >
            ← Go Back
          </button>
        </div>
      </div>
    </main>
  );
}