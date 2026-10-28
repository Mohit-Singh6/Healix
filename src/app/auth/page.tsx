"use client";

import { useRouter } from "next/navigation";
import { ArrowRight, GitBranch, LockKeyhole, ShieldCheck } from "lucide-react";
import { useDevMode } from "@/src/components/providers/DevModeProvider";

export default function AuthPage() {
  const { setIsLoggedIn } = useDevMode();
  const router = useRouter();

  function enterPreview() {
    setIsLoggedIn(true);
    router.push("/dashboard");
  }

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 items-center justify-center px-5 py-14 sm:px-8 lg:px-12">
      <section className="glass-card w-full max-w-2xl rounded-3xl p-7 sm:p-10 md:p-12">
        <div className="mx-auto flex size-16 items-center justify-center rounded-2xl border border-cyan-300/25 bg-cyan-300/10 text-cyan-200 shadow-[0_0_30px_rgba(6,182,212,0.12)]">
          <LockKeyhole aria-hidden="true" size={28} />
        </div>
        <p className="eyebrow mt-7 text-center">SECURE WORKSPACE ACCESS</p>
        <h1 className="mt-3 text-center text-4xl font-extrabold tracking-tight text-white sm:text-5xl">Welcome to Healix</h1>
        <p className="mx-auto mt-4 max-w-lg text-center text-lg leading-8 text-slate-400">
          Sign in to connect your services and bring calm to your incident response.
        </p>

        <div className="mt-9 flex flex-col gap-4">
          <button
            type="button"
            disabled
            title="GitHub sign-in is planned for Phase 4."
            className="inline-flex h-14 items-center justify-center gap-3 rounded-xl border border-white/15 bg-white/[0.06] px-6 text-lg font-bold text-slate-200 opacity-70"
          >
            <GitBranch aria-hidden="true" size={21} />
            Continue with GitHub
            <span className="ml-auto text-sm font-semibold text-slate-500">PHASE 4</span>
          </button>
          <button
            type="button"
            disabled
            title="Google sign-in is planned for Phase 4."
            className="inline-flex h-14 items-center justify-center gap-3 rounded-xl border border-white/10 bg-[#080e1a] px-6 text-lg font-semibold text-slate-300 opacity-70"
          >
            <span aria-hidden="true" className="flex size-6 items-center justify-center rounded-full bg-white text-sm font-black text-blue-600">G</span>
            Continue with Google
            <span className="ml-auto text-sm font-semibold text-slate-500">PHASE 4</span>
          </button>
        </div>

        <div className="my-8 flex items-center gap-4 text-sm font-semibold tracking-wider text-slate-500">
          <span className="h-px flex-1 bg-white/10" />
          DEVELOPER PREVIEW
          <span className="h-px flex-1 bg-white/10" />
        </div>

        <button
          type="button"
          onClick={enterPreview}
          className="group flex min-h-16 w-full items-center justify-between gap-4 rounded-xl border border-cyan-400/25 bg-cyan-400/[0.07] px-5 py-4 text-left text-base font-semibold text-cyan-100 transition hover:border-cyan-300/60 hover:bg-cyan-400/[0.12] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300 sm:px-6"
        >
          <span className="flex items-center gap-3">
            <ShieldCheck aria-hidden="true" size={21} className="shrink-0 text-cyan-300" />
            <span>Click here to enter dashboard as Mock Operator</span>
          </span>
          <ArrowRight aria-hidden="true" size={20} className="shrink-0 transition group-hover:translate-x-1" />
        </button>
        <p className="mt-4 text-center text-sm leading-6 text-slate-500">
          Provider sign-in is a Phase 4 stub. Preview access is local to this session.
        </p>
      </section>
    </main>
  );
}
