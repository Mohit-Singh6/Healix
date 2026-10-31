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
    <main className="mx-auto flex w-full max-w-7xl flex-1 items-center justify-center bg-[#121211] px-5 py-14 sm:px-8 lg:px-12">
      <section className="w-full max-w-md rounded-lg border border-[#2B2A24] bg-[#1B1B18] p-8">
        <div className="mx-auto flex size-14 items-center justify-center rounded-md border border-[#383730] bg-[#121211] text-[#F59E0B]">
          <LockKeyhole aria-hidden="true" size={28} />
        </div>
        <p className="mt-7 text-center font-mono text-xs tracking-wider text-[#A1A19A]">HEALIX // ACCESS CONTROL</p>
        <h1 className="mt-3 text-center text-3xl font-semibold tracking-tight text-[#EDEDE8]">Sign in to Healix</h1>
        <p className="mx-auto mt-4 max-w-lg text-center text-sm leading-6 text-[#A1A19A]">
          Sign in to connect your services and bring calm to your incident response.
        </p>

        <div className="mt-8 flex flex-col gap-3">
          <button
            type="button"
            disabled
            title="GitHub sign-in is not connected in this preview."
            className="inline-flex h-12 items-center justify-center gap-3 rounded-md border border-[#383730] bg-[#242420] px-5 text-sm font-medium text-[#EDEDE8] transition-colors hover:bg-[#2F2E29] disabled:cursor-not-allowed disabled:opacity-70"
          >
            <GitBranch aria-hidden="true" size={18} />
            Continue with GitHub
          </button>
          <button
            type="button"
            disabled
            title="Google sign-in is not connected in this preview."
            className="inline-flex h-12 items-center justify-center gap-3 rounded-md border border-[#383730] bg-[#242420] px-5 text-sm font-medium text-[#EDEDE8] transition-colors hover:bg-[#2F2E29] disabled:cursor-not-allowed disabled:opacity-70"
          >
            <span aria-hidden="true" className="flex size-5 items-center justify-center rounded-full bg-[#EDEDE8] text-xs font-bold text-[#242420]">G</span>
            Continue with Google
          </button>
        </div>

        <div className="my-7 flex items-center gap-4 font-mono text-[10px] tracking-wider text-[#77766F]">
          <span className="h-px flex-1 bg-[#2B2A24]" />
          DEVELOPER PREVIEW
          <span className="h-px flex-1 bg-[#2B2A24]" />
        </div>

        <button
          type="button"
          onClick={enterPreview}
          className="group flex min-h-14 w-full items-center justify-between gap-4 rounded-md border border-[#F59E0B]/30 bg-[#121211] px-4 py-3 text-left font-mono text-xs text-[#F59E0B] transition-colors hover:border-[#F59E0B]/60 hover:bg-[#F59E0B]/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F59E0B]"
        >
          <span className="flex items-center gap-3">
            <ShieldCheck aria-hidden="true" size={18} className="shrink-0" />
            <span>› Enter developer preview as Operator →</span>
          </span>
          <ArrowRight aria-hidden="true" size={17} className="shrink-0 transition group-hover:translate-x-1" />
        </button>
        <p className="mt-4 text-center text-xs leading-5 text-[#77766F]">
          Provider sign-in is not connected in this preview. Preview access is local to this session.
        </p>
      </section>
    </main>
  );
}
