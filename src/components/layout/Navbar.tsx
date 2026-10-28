"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { ArrowRight, LogOut, UserRound } from "lucide-react";
import { useDevMode } from "@/src/components/providers/DevModeProvider";

export default function Navbar() {
  const { isLoggedIn, setIsLoggedIn, toggleLoggedIn } = useDevMode();
  const router = useRouter();

  function logOut() {
    setIsLoggedIn(false);
    router.push("/");
  }

  return (
    <header className="sticky top-0 z-40 border-b border-cyan-400/10 bg-[#050811]/90 backdrop-blur-xl">
      <nav
        aria-label="Main navigation"
        className="mx-auto flex min-h-20 max-w-[1600px] flex-wrap items-center justify-between gap-4 px-5 py-3 sm:px-8 lg:px-12"
      >
        <Link href="/" className="group flex items-center gap-1" aria-label="Healix home">
          <Image
            src="/Healix_Logo-clean.png"
            alt=""
            width={48}
            height={48}
            priority
            className="size-11 object-contain"
          />
          <Image
            src="/Healix_Text_Logo.png"
            alt="Healix"
            width={130}
            height={73}
            priority
            className="-ml-4 h-[4.2rem] w-[125px] object-contain sm:w-[145px]"
          />
        </Link>

        <div className="flex flex-wrap items-center justify-end gap-3 sm:gap-4">
          <button
            type="button"
            onClick={toggleLoggedIn}
            aria-pressed={isLoggedIn}
            className="inline-flex h-11 items-center gap-2 rounded-full border border-cyan-400/20 bg-[#0c1427]/90 px-4 text-sm font-semibold text-slate-300 transition hover:border-cyan-300/50 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300 sm:px-5"
          >
            <span className="text-slate-500">Mode:</span>
            <span className={isLoggedIn ? "text-cyan-200" : "text-slate-200"}>
              {isLoggedIn ? "Logged In" : "Logged Out"}
            </span>
            <span aria-hidden="true" className="text-cyan-400">⇄</span>
          </button>

          {isLoggedIn ? (
            <>
              <Link
                href="/dashboard"
                className="inline-flex h-12 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 text-base font-semibold text-slate-200 transition hover:border-cyan-300/40 hover:text-white"
              >
                <UserRound aria-hidden="true" size={18} />
                <span className="hidden sm:inline">Mock Operator</span>
                <span className="sm:hidden">Profile</span>
              </Link>
              <button
                type="button"
                onClick={logOut}
                className="inline-flex h-12 items-center gap-2 rounded-xl px-3 text-base font-semibold text-slate-400 transition hover:text-rose-300"
              >
                <LogOut aria-hidden="true" size={18} />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </>
          ) : (
            <Link
              href="/auth"
              className="button-primary inline-flex h-12 items-center gap-2 rounded-xl px-5 text-base font-bold text-slate-950"
            >
              Get Started
              <ArrowRight aria-hidden="true" size={18} />
            </Link>
          )}
        </div>
      </nav>
    </header>
  );
}
