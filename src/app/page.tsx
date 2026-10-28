import Link from "next/link";
import Image from "next/image";
import { Activity, ArrowDown, ArrowRight, Check, GitBranch, ShieldCheck, Sparkles, Workflow } from "lucide-react";

const steps = ["Alert Ingestion", "Culprit Git Diff", "Gemini Diagnosis", "Ready-to-Merge PR"];
const features = [
  { icon: Activity, title: "Correlate the noise", text: "Group repetitive alerts into one focused incident, complete with the logs and context your team needs." },
  { icon: GitBranch, title: "Find the change", text: "Trace production symptoms back to the exact commit and service that introduced the regression." },
  { icon: ShieldCheck, title: "Keep humans in control", text: "Review every diagnosis and proposed change before anything is approved for production." },
];

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-[1600px] px-5 pb-24 pt-10 sm:px-8 sm:pt-14 lg:px-12">
      <section className="relative grid min-h-[640px] items-center gap-12 py-10 lg:grid-cols-[1.02fr_.98fr] lg:gap-16">
        <div className="absolute -left-28 top-20 size-80 rounded-full bg-cyan-500/10 blur-[120px]" />
        <div className="relative z-10">
          <div className="mb-7 inline-flex items-center gap-3 rounded-full border border-cyan-400/20 bg-cyan-400/[0.07] px-5 py-3 text-sm font-semibold tracking-wide text-cyan-200">
            <span className="size-2.5 rounded-full bg-cyan-300 shadow-[0_0_14px_#06b6d4]" />
            INCIDENT RESPONSE, REIMAGINED
          </div>
          <h1 className="max-w-4xl text-5xl font-extrabold leading-[1.02] tracking-[-0.055em] text-white sm:text-6xl lg:text-7xl">
            Self-Healing Code.
            <br />
            <span className="text-gradient">Zero 3 AM Alert Fatigue.</span>
          </h1>
          <p className="mt-8 max-w-2xl text-lg leading-8 text-slate-400 sm:text-xl">
            Healix connects the alert to the code change, diagnoses the failure, and prepares a fix your team can review.
          </p>
          <div className="mt-10 flex flex-wrap items-center gap-5">
            <Link href="/auth" className="button-primary inline-flex h-14 items-center gap-3 rounded-xl px-7 text-lg font-bold text-slate-950">
              Get Started <ArrowRight aria-hidden="true" size={20} />
            </Link>
            <span className="text-base text-slate-500">A calmer on-call starts here.</span>
          </div>
          <div className="mt-12 flex flex-wrap items-center gap-x-8 gap-y-4 text-base text-slate-400">
            <span className="flex items-center gap-3"><ShieldCheck aria-hidden="true" size={19} className="text-cyan-300" /> Human approved</span>
            <span className="flex items-center gap-3"><Workflow aria-hidden="true" size={19} className="text-cyan-300" /> End-to-end context</span>
          </div>
        </div>

        <div className="relative">
          <div className="absolute inset-8 rounded-full bg-blue-500/10 blur-[90px]" />
          <div className="glass-card relative rounded-3xl p-6 sm:p-8">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/[0.07] pb-6">
              <div>
                <p className="eyebrow">AUTONOMOUS RESPONSE PIPELINE</p>
                <h2 className="mt-2 text-2xl font-bold text-white">From alert to action</h2>
              </div>
              <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-4 py-2 text-xs font-bold tracking-wider text-emerald-300">LIVE SYSTEM</span>
            </div>
            <div className="mt-7 grid gap-2">
              {steps.map((step, index) => {
                const Icon = [Activity, GitBranch, Sparkles, Check][index];
                return (
                  <div key={step}>
                    <div className="flex items-center gap-3">
                      <div className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-400/[0.08] font-mono text-sm text-cyan-300">
                        0{index + 1}
                      </div>
                      <div className="flex min-h-14 flex-1 items-center justify-between gap-3 rounded-xl border border-white/[0.07] bg-[#0a1120]/80 px-4 py-3 sm:px-5">
                        <span className="text-base font-semibold text-slate-200">{step}</span>
                        <Icon aria-hidden="true" size={19} className={index === 3 ? "text-blue-300" : "text-cyan-300"} />
                      </div>
                    </div>
                    {index < steps.length - 1 && <ArrowDown aria-hidden="true" size={17} className="ml-[13px] mt-1 text-cyan-400/60" />}
                  </div>
                );
              })}
            </div>
            <div className="mt-7 flex items-center gap-4 rounded-xl border border-cyan-300/15 bg-cyan-300/[0.05] p-5">
              <Sparkles aria-hidden="true" size={22} className="shrink-0 text-cyan-300" />
              <p className="text-base leading-7 text-slate-300">Context in. <span className="text-cyan-200">Clear next steps out.</span></p>
            </div>
            <div className="mt-6 flex items-center justify-between gap-4 text-xs font-semibold tracking-wider text-slate-500">
              <span>LANGGRAPH ORCHESTRATION</span>
              <span className="flex items-center gap-2">
                <Image
                  src="/Healix_Text_Logo.png"
                  alt="Healix"
                  width={130}
                  height={73}
                  className="h-8 w-14 object-contain"
                />
                <span>/ CORE</span>
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-12">
        <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="eyebrow">BUILT FOR THE MOMENT AFTER THE ALERT</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Your incident workflow, <span className="text-cyan-300">with context.</span>
            </h2>
          </div>
          <p className="max-w-lg text-lg leading-8 text-slate-400">Less time reconstructing what happened. More time making the right call.</p>
        </div>
        <div className="grid gap-5 md:grid-cols-3">
          {features.map(({ icon: Icon, title, text }, index) => (
            <article key={title} className="glass-card feature-card rounded-2xl p-7 md:p-8">
              <div className="flex size-14 items-center justify-center rounded-xl border border-cyan-300/20 bg-cyan-300/[0.08] text-cyan-200">
                <Icon aria-hidden="true" size={24} />
              </div>
              <p className="mt-7 font-mono text-sm text-cyan-300/70">0{index + 1} / CAPABILITY</p>
              <h3 className="mt-3 text-2xl font-bold text-white">{title}</h3>
              <p className="mt-3 text-base leading-7 text-slate-400">{text}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
