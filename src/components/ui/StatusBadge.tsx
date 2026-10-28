import type { ReactNode } from "react";

type StatusBadgeProps = {
  children: ReactNode;
  tone?: "critical" | "high" | "ready" | "healthy" | "muted";
  className?: string;
};

const toneClasses = {
  critical: "border-rose-500/40 bg-rose-950/50 text-rose-300 shadow-[0_0_15px_rgba(244,63,94,0.16)]",
  high: "border-amber-500/40 bg-amber-950/50 text-amber-300",
  ready: "border-cyan-400/40 bg-cyan-950/50 text-cyan-200",
  healthy: "border-emerald-500/40 bg-emerald-950/50 text-emerald-300",
  muted: "border-slate-500/30 bg-slate-800/60 text-slate-300",
};

export default function StatusBadge({
  children,
  tone = "muted",
  className = "",
}: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex min-h-8 items-center gap-2 rounded-full border px-3 py-1 text-xs font-bold tracking-[0.12em] ${toneClasses[tone]} ${className}`}
    >
      {children}
    </span>
  );
}
