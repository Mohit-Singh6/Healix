import type { ReactNode } from "react";

type StatusBadgeProps = {
  children: ReactNode;
  tone?: "critical" | "high" | "ready" | "healthy" | "muted";
  className?: string;
};

const toneClasses = {
  critical: "border-rose-800/40 bg-rose-950/40 text-rose-300",
  high: "border-[#D97706]/40 bg-[#F59E0B]/10 text-[#F59E0B]",
  ready: "border-emerald-800/40 bg-emerald-950/40 text-emerald-400",
  healthy: "border-emerald-800/40 bg-emerald-950/40 text-emerald-400",
  muted: "border-[#383730] bg-[#1B1B18] text-[#A1A19A]",
};

export default function StatusBadge({
  children,
  tone = "muted",
  className = "",
}: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex min-h-7 items-center gap-2 rounded-md border px-2.5 py-1 font-mono text-[11px] tracking-wide ${toneClasses[tone]} ${className}`}
    >
      {children}
    </span>
  );
}
