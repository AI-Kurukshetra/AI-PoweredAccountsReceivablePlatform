import { statusClasses } from "@/lib/format";

const toneByLabel: Record<string, "neutral" | "brand" | "accent" | "success" | "danger" | "info"> = {
  Draft: "neutral",
  draft: "neutral",
  owner: "brand",
  admin: "info",
  finance_manager: "success",
  collector: "accent",
  viewer: "neutral",
  sandbox: "neutral",
  configured: "info",
  live: "success",
  paused: "accent",
  degraded: "danger",
  completed: "success",
  running: "info",
  verified: "success",
  implemented: "success",
  monitoring: "info",
  gap: "danger",
  confirmed: "success",
  delivered: "success",
  Scheduled: "info",
  scheduled: "info",
  Sent: "brand",
  sent: "brand",
  Partial: "accent",
  partial: "accent",
  Overdue: "danger",
  overdue: "danger",
  Paid: "success",
  paid: "success",
  Disputed: "danger",
  disputed: "danger",
  Low: "success",
  Medium: "accent",
  High: "danger",
  Healthy: "success",
  healthy: "success",
  Lagging: "danger",
  lagging: "danger",
  Review: "accent",
  review: "accent",
  Planned: "neutral",
  planned: "neutral",
  not_required: "neutral",
  Queued: "brand",
  Escalated: "danger",
  SentReminder: "brand",
  Settled: "success",
  settled: "success",
  Pending: "accent",
  pending: "accent",
  Failed: "danger",
  failed: "danger",
  refunded: "neutral",
  SentMessage: "brand",
};

export function StatusPill({ label }: { label: string }) {
  const tone = toneByLabel[label] ?? "neutral";

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusClasses(tone)}`}
    >
      {label.replaceAll("_", " ")}
    </span>
  );
}
