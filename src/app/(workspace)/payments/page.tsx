import Link from "next/link";
import { EmptyState } from "@/components/ui/empty-state";
import { SectionCard } from "@/components/ui/section-card";
import { StatusPill } from "@/components/ui/status-pill";
import { formatCurrency } from "@/lib/format";
import { getWorkspaceSnapshot } from "@/lib/workspace-data";

export default async function PaymentsPage() {
  const snapshot = await getWorkspaceSnapshot();

  if (!snapshot) {
    return null;
  }

  const settledAmount = snapshot.payments
    .filter((payment) => payment.status === "settled")
    .reduce((sum, payment) => sum + Number(payment.amount), 0);
  const pendingCount = snapshot.payments.filter(
    (payment) => payment.status === "pending",
  ).length;

  return (
    <div className="space-y-5">
      <section className="card-surface rounded-[28px] p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-xs uppercase tracking-[0.24em] text-[var(--stroke-strong)]">
              Payments
            </p>
            <h2 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-[var(--foreground)]">
              Incoming receipts and reconciliation stay in one clean queue.
            </h2>
            <p className="mt-3 text-sm leading-6 text-[var(--ink-soft)]">
              Record and review settlement activity without the page turning into a long stacked list.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="soft-panel rounded-xl px-4 py-3 text-sm">
              <p className="text-[var(--stroke-strong)]">Settled value</p>
              <p className="mt-1 font-semibold text-[var(--foreground)]">
                {formatCurrency(settledAmount)}
              </p>
            </div>
            <div className="soft-panel rounded-xl px-4 py-3 text-sm">
              <p className="text-[var(--stroke-strong)]">Pending</p>
              <p className="mt-1 font-semibold text-[var(--foreground)]">{pendingCount}</p>
            </div>
            <Link href="/payments/new" className="primary-button">
              Record payment
            </Link>
          </div>
        </div>
      </section>

      <SectionCard eyebrow="Payments" title="Incoming receipts and reconciliation queue">
        {snapshot.payments.length ? (
          <div className="space-y-3">
            {snapshot.payments.map((payment) => (
              <div
                key={payment.id}
                className="grid gap-4 rounded-[20px] border border-[var(--stroke)] bg-white px-5 py-4 md:grid-cols-[1.15fr_0.7fr_0.7fr_0.9fr_auto]"
              >
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-[var(--stroke-strong)]">
                    {payment.external_ref ?? payment.id.slice(0, 8)}
                  </p>
                  <h3 className="mt-2 text-lg font-semibold text-[var(--foreground)]">
                    {payment.customer?.name ?? "Unknown customer"}
                  </h3>
                  <p className="mt-1 text-sm text-[var(--ink-soft)]">
                    Linked to {payment.invoice?.invoice_number ?? "unmatched invoice"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-[var(--stroke-strong)]">Amount</p>
                  <p className="mt-1 font-semibold text-[var(--foreground)]">
                    {formatCurrency(Number(payment.amount))}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-[var(--stroke-strong)]">Channel</p>
                  <p className="mt-1 font-semibold capitalize text-[var(--foreground)]">
                    {payment.channel}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-[var(--stroke-strong)]">Received</p>
                  <p className="mt-1 font-semibold text-[var(--foreground)]">
                    {payment.received_at
                      ? new Date(payment.received_at).toLocaleString("en-US", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "Not received"}
                  </p>
                </div>
                <div className="md:justify-self-end">
                  <StatusPill label={payment.status} />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            title="No payments tracked"
            copy="Once receipts are recorded or synced, they will appear here for reconciliation."
          />
        )}
      </SectionCard>
    </div>
  );
}
