import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { statusClasses } from "@/lib/format";
import type { SummaryMetric } from "@/lib/types";

const toneStyles: Record<
  SummaryMetric["tone"],
  { ring: string; glow: string; dot: string }
> = {
  brand: {
    ring: "border-[rgba(12,166,120,0.24)]",
    glow: "from-[rgba(12,166,120,0.14)] to-transparent",
    dot: "bg-[var(--brand)]",
  },
  accent: {
    ring: "border-[rgba(255,180,67,0.28)]",
    glow: "from-[rgba(255,180,67,0.16)] to-transparent",
    dot: "bg-[var(--accent)]",
  },
  success: {
    ring: "border-[rgba(34,145,107,0.24)]",
    glow: "from-[rgba(34,145,107,0.14)] to-transparent",
    dot: "bg-[var(--success)]",
  },
  danger: {
    ring: "border-[rgba(224,86,102,0.26)]",
    glow: "from-[rgba(224,86,102,0.14)] to-transparent",
    dot: "bg-[var(--danger)]",
  },
};

export function KpiCard({ metric }: { metric: SummaryMetric }) {
  const changeText = metric.change.trim();
  const showDirection =
    changeText.startsWith("+") ||
    changeText.startsWith("-") ||
    changeText.includes("improvement");
  const positive =
    changeText.startsWith("+") || changeText.includes("improvement");
  const tone = toneStyles[metric.tone];

  return (
    <div className={`card-surface relative overflow-hidden rounded-[26px] border ${tone.ring} p-5`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className={`h-2.5 w-2.5 rounded-full ${tone.dot}`} />
            <p className="text-xs uppercase tracking-[0.2em] text-[var(--stroke-strong)]">
              {metric.label}
            </p>
          </div>
          <p className="mt-3 text-4xl font-semibold tracking-[-0.04em] text-[var(--foreground)]">
            {metric.value}
          </p>
        </div>
        <span
          className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold ${statusClasses(metric.tone)}`}
        >
          {showDirection ? (
            positive ? (
              <ArrowUpRight className="h-3.5 w-3.5" />
            ) : (
              <ArrowDownRight className="h-3.5 w-3.5" />
            )
          ) : null}
          {metric.change}
        </span>
      </div>
    </div>
  );
}
