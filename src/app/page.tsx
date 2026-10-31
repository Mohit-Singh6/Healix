import Link from "next/link";
import { ArrowRight, ChevronRight, GitBranch, ShieldCheck } from "lucide-react";

const integrations = ["PagerDuty", "Sentry", "Datadog", "GitHub", "Slack"];

const pipeline = [
  {
    number: "01",
    title: "Telemetry Ingestion",
    detail: "Webhook capture, error logs, and stack-trace parsing",
  },
  {
    number: "02",
    title: "AST & Blame Correlation",
    detail: "Vector search over repo graph and commit history",
  },
  {
    number: "03",
    title: "Sandboxed Diagnostic & Patch",
    detail: "LLM-driven fix verification with automated test suites",
  },
  {
    number: "04",
    title: "Ready-to-Merge Pull Request",
    detail: "Complete branch with forensic context and one-click deployment",
  },
];

const footerGroups = [
  {
    title: "Product",
    links: [
      { label: "How it works", href: "/#architecture" },
      { label: "Safeguards", href: "/#capabilities" },
      { label: "Incident workflow", href: "/#comparison" },
    ],
  },
  {
    title: "Integrations",
    links: integrations.map((label) => ({ label, href: "/#integrations" })),
  },
  {
    title: "Documentation",
    links: [
      { label: "Architecture", href: "/#architecture" },
      { label: "Getting started", href: "/auth" },
      { label: "Contact us", href: "/#contact" },
    ],
  },
  {
    title: "Security & Legal",
    links: [
      { label: "Sandboxing", href: "/#capabilities" },
      { label: "Human approval", href: "/#capabilities" },
      { label: "Privacy", href: "/#contact" },
    ],
  },
];

export default function Home() {
  return (
    <main className="min-h-screen flex-1 bg-[#121211] text-[#E2E2DC]">
      <div className="mx-auto w-full max-w-[1440px] px-5 sm:px-8 lg:px-12">
        <section className="grid gap-12 border-b border-[#2B2A24] py-16 sm:py-20 lg:grid-cols-[1fr_0.92fr] lg:items-center lg:gap-16 lg:py-24">
          <div>
            <p className="mb-6 flex items-center gap-3 font-mono text-xs font-medium uppercase tracking-[0.16em] text-[#A1A19A]">
              <span aria-hidden="true" className="size-2 rounded-full bg-[#F59E0B]" />
              Incident response, engineered
            </p>
            <h1 className="max-w-3xl text-4xl font-semibold leading-[1.08] tracking-tight text-[#E2E2DC] sm:text-5xl lg:text-6xl">
              Self-Healing Code. Zero 3 AM Alert Fatigue.
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-7 text-[#A1A19A] sm:text-lg sm:leading-8">
              Healix maps production telemetry to the code and commit that caused it, then diagnoses the root cause and generates a verified pull request in an isolated sandbox.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-4">
              <Link
                href="/auth"
                className="inline-flex items-center gap-2 rounded-md bg-[#F59E0B] px-5 py-3 font-medium text-black transition-colors hover:bg-[#D97706] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F59E0B]"
              >
                Get Started <ArrowRight aria-hidden="true" size={17} />
              </Link>
              <Link
                href="#architecture"
                className="inline-flex items-center gap-2 text-sm font-medium text-[#E2E2DC] transition-colors hover:text-[#F59E0B]"
              >
                Read Documentation <span aria-hidden="true">→</span>
              </Link>
            </div>
            <div id="integrations" className="mt-12 border-t border-[#2B2A24] pt-5">
              <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#77766F]">
                Connects to your incident stack
              </p>
              <ul className="mt-4 flex flex-wrap gap-x-7 gap-y-3 text-sm font-medium text-[#A1A19A]">
                {integrations.map((integration) => (
                  <li key={integration}>{integration}</li>
                ))}
              </ul>
            </div>
          </div>

          <article className="overflow-hidden rounded-lg border border-[#2B2A24] bg-[#1B1B18]">
            <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[#2B2A24] px-5 py-4 sm:px-6">
              <p className="font-mono text-xs font-medium tracking-wide text-[#E2E2DC]">
                INCIDENT #842: SEV-2 LATENCY SPIKE
              </p>
              <span className="rounded-sm border border-[#EF4444]/30 bg-[#EF4444]/10 px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-[#EF4444]">
                Investigating
              </span>
            </header>
            <div className="px-5 py-5 sm:px-6">
              <div className="flex items-center justify-between gap-4">
                <p className="font-mono text-xs text-[#A1A19A]">src/api/cache.ts · blame correlation</p>
                <GitBranch aria-hidden="true" size={15} className="shrink-0 text-[#A1A19A]" />
              </div>
              <div className="mt-5 overflow-x-auto rounded-md border border-[#2B2A24] bg-[#121211] p-4 font-mono text-xs leading-7">
                <p className="text-[#77766F]">@@ -41,7 +41,7 @@ async function getCachedRecord</p>
                <p className="whitespace-pre text-[#A1A19A]">  const record = await cache.get(key);</p>
                <p className="whitespace-pre bg-[#EF4444]/10 text-[#EF4444]">
                  <span className="mr-3 select-none">-</span>
                  <span className="line-through">  await refreshAllRecords();</span>
                </p>
                <p className="whitespace-pre bg-[#10B981]/10 text-[#10B981]">
                  <span className="mr-3 select-none">+</span>
                  <span>  if (!record) await refreshRecord(key);</span>
                </p>
                <p className="whitespace-pre text-[#A1A19A]">  return record;</p>
              </div>
              <div className="mt-5 flex items-start gap-3 border-l-2 border-[#F59E0B] pl-4">
                <ShieldCheck aria-hidden="true" size={17} className="mt-0.5 shrink-0 text-[#F59E0B]" />
                <p className="text-sm leading-6 text-[#A1A19A]">
                  Root cause: an unbounded refresh invalidates the cache on every request.
                </p>
              </div>
            </div>
            <footer className="border-t border-[#2B2A24] px-5 py-4 sm:px-6">
              <p className="font-mono text-[11px] leading-5 text-[#10B981]">
                Automated PR #142 Ready to Merge • Verified in Sandbox (4.2s)
              </p>
            </footer>
          </article>
        </section>

        <section id="architecture" className="scroll-mt-24 border-b border-[#2B2A24] py-16 sm:py-20">
          <div className="mb-9 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.15em] text-[#F59E0B]">The remediation loop</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">From raw signal to reviewed fix.</h2>
            </div>
            <p className="max-w-md text-sm leading-6 text-[#A1A19A]">
              Every step preserves the evidence trail, from the first webhook to the branch your team reviews.
            </p>
          </div>
          <ol className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {pipeline.map((step, index) => (
              <li key={step.number} className="relative min-h-52 border border-[#2B2A24] bg-[#1B1B18] p-5 md:p-6">
                <div className="flex items-center gap-3 font-mono text-xs tracking-wide text-[#F59E0B]">
                  <span>{step.number}</span>
                  <span aria-hidden="true" className="h-px flex-1 bg-[#2B2A24]" />
                  {index < pipeline.length - 1 && (
                    <ChevronRight aria-hidden="true" size={14} className="hidden text-[#77766F] xl:block" />
                  )}
                  <span className="text-[#77766F]">/ PIPELINE</span>
                </div>
                <h3 className="mt-7 text-lg font-semibold leading-6 text-[#E2E2DC]">{step.title}</h3>
                <p className="mt-3 text-sm leading-6 text-[#A1A19A]">{step.detail}</p>
              </li>
            ))}
          </ol>
        </section>

        <section id="capabilities" className="scroll-mt-24 border-b border-[#2B2A24] py-16 sm:py-20">
          <div className="mb-9">
            <p className="font-mono text-xs uppercase tracking-[0.15em] text-[#F59E0B]">Platform capabilities</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Autonomy, with guardrails.</h2>
          </div>
          <div className="grid gap-4 lg:grid-cols-3 lg:grid-rows-[minmax(230px,auto)_minmax(210px,auto)]">
            <article className="rounded-lg border border-[#2B2A24] bg-[#1B1B18] p-6 sm:p-8 lg:col-span-2">
              <p className="font-mono text-xs uppercase tracking-wider text-[#A1A19A]">01 / Execution safety</p>
              <h3 className="mt-4 text-2xl font-semibold tracking-tight">Deterministic Guardrails &amp; Sandboxing</h3>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-[#A1A19A]">
                Proposed changes run in an isolated environment. The patch is held until required checks pass.
              </p>
              {/* Static terminal preview; wire this panel to live sandbox runs when telemetry is available. */}
              <div className="mt-6 rounded-md border border-[#2B2A24] bg-[#121211] p-4 font-mono text-xs leading-6">
                <p className="text-[#77766F]">$ healix verify --branch fix/cache-refresh</p>
                <p className="mt-2 text-[#A1A19A]">[1/3] unit tests <span className="text-[#10B981]">passed</span></p>
                <p className="text-[#A1A19A]">[2/3] regression suite <span className="text-[#10B981]">passed</span></p>
                <p className="text-[#A1A19A]">[3/3] patch policy <span className="text-[#10B981]">verified</span></p>
                <p className="mt-2 text-[#10B981]">Sandbox complete · 4.2s · awaiting review</p>
              </div>
            </article>

            <article className="rounded-lg border border-[#2B2A24] bg-[#1B1B18] p-6 sm:p-8">
              <p className="font-mono text-xs uppercase tracking-wider text-[#A1A19A]">02 / Operator control</p>
              <h3 className="mt-4 text-xl font-semibold">Human-in-the-Loop Safeguards</h3>
              <p className="mt-3 text-sm leading-6 text-[#A1A19A]">
                Require an operator sign-off before a verified change can merge.
              </p>
              <div className="mt-7 flex items-center justify-between border-t border-[#2B2A24] pt-5">
                <span className="text-sm text-[#E2E2DC]">Approval required</span>
                <span
                  aria-label="Approval required: enabled"
                  className="flex h-6 w-11 items-center rounded-full border border-[#F59E0B]/50 bg-[#F59E0B]/15 px-0.5"
                >
                  <span className="ml-auto size-4 rounded-full bg-[#F59E0B]" />
                </span>
              </div>
            </article>

            <article className="rounded-lg border border-[#2B2A24] bg-[#1B1B18] p-6 sm:p-8 lg:col-span-1">
              <p className="font-mono text-xs uppercase tracking-wider text-[#A1A19A]">03 / Codebase context</p>
              <h3 className="mt-4 text-xl font-semibold">Repository Graph Embeddings</h3>
              <p className="mt-3 text-sm leading-6 text-[#A1A19A]">
                Connect service relationships, code ownership, commit history, and prior post-mortems to each diagnosis.
              </p>
              <div className="mt-5 flex flex-wrap gap-2 font-mono text-[11px] text-[#A1A19A]">
                <span className="border border-[#2B2A24] px-2 py-1">service graph</span>
                <span className="border border-[#2B2A24] px-2 py-1">git history</span>
                <span className="border border-[#2B2A24] px-2 py-1">post-mortems</span>
              </div>
            </article>

            <article className="rounded-lg border border-[#F59E0B]/40 bg-[#1B1B18] p-6 sm:p-8 lg:col-span-2">
              <p className="font-mono text-xs uppercase tracking-wider text-[#F59E0B]">04 / Incident impact</p>
              {/* Static illustrative metrics; replace with verified customer telemetry before publishing live results. */}
              <div className="mt-6 grid gap-6 sm:grid-cols-2 sm:gap-10">
                <div>
                  <p className="text-4xl font-semibold tracking-tight text-[#F59E0B] sm:text-5xl">94%</p>
                  <p className="mt-2 text-sm text-[#A1A19A]">MTTR Reduction</p>
                </div>
                <div>
                  <p className="text-4xl font-semibold tracking-tight text-[#F59E0B] sm:text-5xl">&lt; 5 min</p>
                  <p className="mt-2 text-sm text-[#A1A19A]">Mean Triage Time</p>
                </div>
              </div>
            </article>
          </div>
        </section>

        <section id="comparison" className="scroll-mt-24 border-b border-[#2B2A24] py-16 sm:py-20">
          <div className="mb-9">
            <p className="font-mono text-xs uppercase tracking-[0.15em] text-[#F59E0B]">A different on-call</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">The alert still arrives. The night changes.</h2>
          </div>
          <div className="grid overflow-hidden rounded-lg border border-[#2B2A24] md:grid-cols-2">
            <article className="bg-[#1B1B18] p-6 sm:p-8">
              <p className="font-mono text-xs uppercase tracking-wider text-[#A1A19A]">Traditional incident response</p>
              <ol className="mt-6 flex flex-col gap-4">
                {[
                  ["3:00 AM", "PagerDuty alarm"],
                  ["3:12 AM", "Groggy context switching"],
                  ["3:48 AM", "Manual log hunting"],
                  ["4:16 AM", "Rushed patch"],
                  ["4:30 AM", "Fatigue sets in"],
                ].map(([time, event], index) => (
                  <li key={event} className="flex gap-4">
                    <span className="w-16 shrink-0 font-mono text-xs text-[#77766F]">{time}</span>
                    <span className="relative flex-1 border-l border-[#2B2A24] pb-1 pl-4 text-sm text-[#A1A19A]">
                      {index < 4 && <span aria-hidden="true" className="absolute -left-1 top-1 size-2 rounded-full bg-[#77766F]" />}
                      {event}
                    </span>
                  </li>
                ))}
              </ol>
            </article>
            <article className="border-t border-[#2B2A24] bg-[#1B1B18] p-6 md:border-l md:border-t-0 sm:p-8">
              <p className="font-mono text-xs uppercase tracking-wider text-[#F59E0B]">Healix autonomous remediation</p>
              <ol className="mt-6 flex flex-col gap-4">
                {[
                  ["3:00 AM", "Alert captured"],
                  ["3:01 AM", "Automated triage & verification"],
                  ["3:04 AM", "Verified PR ready in inbox"],
                  ["9:00 AM", "One-click review"],
                ].map(([time, event]) => (
                  <li key={event} className="flex gap-4">
                    <span className="w-16 shrink-0 font-mono text-xs text-[#77766F]">{time}</span>
                    <span className="relative flex-1 border-l border-[#2B2A24] pb-1 pl-4 text-sm text-[#E2E2DC]">
                      <span aria-hidden="true" className="absolute -left-1 top-1 size-2 rounded-full bg-[#10B981]" />
                      {event}
                    </span>
                  </li>
                ))}
              </ol>
            </article>
          </div>
        </section>

        <section id="contact" className="scroll-mt-24 border-b border-[#2B2A24] py-16 text-center sm:py-20">
          <p className="font-mono text-xs uppercase tracking-[0.15em] text-[#F59E0B]">Make room for better engineering</p>
          <h2 className="mx-auto mt-4 max-w-3xl text-3xl font-semibold tracking-tight sm:text-4xl">
            Let your team automate incident triage.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-[#A1A19A]">
            Trace the failure, verify the fix, and review the pull request when your team is ready.
          </p>
          <Link
            href="/auth"
            className="mt-7 inline-flex items-center gap-2 rounded-md bg-[#F59E0B] px-5 py-3 font-medium text-black transition-colors hover:bg-[#D97706] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F59E0B]"
          >
            Get Started <ArrowRight aria-hidden="true" size={17} />
          </Link>
        </section>

        <footer className="py-12">
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4 lg:grid-cols-5">
            <div className="col-span-2 sm:col-span-4 lg:col-span-1">
              <Link href="/" className="inline-flex items-center gap-2 font-semibold tracking-tight text-[#E2E2DC]">
                <span aria-hidden="true" className="size-2 rounded-full bg-[#F59E0B]" />
                Healix
              </Link>
              <p className="mt-3 max-w-xs text-sm leading-6 text-[#A1A19A]">
                Incident response with evidence, guardrails, and human control.
              </p>
            </div>
            {footerGroups.map((group) => (
              <div key={group.title}>
                <h3 className="font-mono text-xs uppercase tracking-wider text-[#E2E2DC]">{group.title}</h3>
                <ul className="mt-4 flex flex-col gap-3">
                  {group.links.map((item) => (
                    <li key={`${group.title}-${item.label}`}>
                      <Link href={item.href} className="text-sm text-[#A1A19A] transition-colors hover:text-[#E2E2DC]">
                        {item.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="mt-10 flex flex-col gap-2 border-t border-[#2B2A24] pt-5 text-xs text-[#77766F] sm:flex-row sm:justify-between">
            <p>© {new Date().getFullYear()} Healix. All rights reserved.</p>
            <p className="font-mono">Built for calmer incident response.</p>
          </div>
        </footer>
      </div>
    </main>
  );
}
