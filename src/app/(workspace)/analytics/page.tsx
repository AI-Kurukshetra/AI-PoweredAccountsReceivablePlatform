import { EmptyState } from "@/components/ui/empty-state";
import { SectionCard } from "@/components/ui/section-card";
import { formatCurrency } from "@/lib/format";
import { getWorkspaceSnapshot } from "@/lib/workspace-data";

export default async function AnalyticsPage() {
  const snapshot = await getWorkspaceSnapshot();

  if (!snapshot) {
    return null;
  }

  const totalInvoices = snapshot.invoices.length;
  const aging = [
    {
      bucket: "Current",
      amount: snapshot.invoices
        .filter((invoice) => !["overdue", "disputed"].includes(invoice.status))
        .reduce((sum, invoice) => sum + Number(invoice.balance_due), 0),
    },
    {
      bucket: "Needs attention",
      amount: snapshot.invoices
        .filter((invoice) => ["overdue", "disputed"].includes(invoice.status))
        .reduce((sum, invoice) => sum + Number(invoice.balance_due), 0),
    },
    {
      bucket: "Settled receipts",
      amount: snapshot.payments
        .filter((payment) => payment.status === "settled")
        .reduce((sum, payment) => sum + Number(payment.amount), 0),
    },
    {
      bucket: "Reminder coverage",
      amount: snapshot.reminderCoverage,
      isPercent: true,
    },
  ];

  const metrics = [
    {
      label: "Collection coverage",
      value: `${snapshot.reminderCoverage}%`,
      note: `${snapshot.reminders.length} reminder records across ${totalInvoices} invoices.`,
    },
    {
      label: "Payment conversion",
      value: `${snapshot.paymentConversion}%`,
      note: `${snapshot.payments.filter((payment) => payment.status === "settled").length} settled receipts in the workspace.`,
    },
    {
      label: "Latest receipt",
      value: snapshot.formatRelativeLabel(snapshot.latestReceipt),
      note: "Newest payment timestamp recorded in Supabase.",
    },
    {
      label: "Dispute load",
      value: `${snapshot.disputes.length}`,
      note: "Count of disputes currently open in the tenant.",
    },
  ];

  return (
    <div className="space-y-5">
      <section className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <div key={metric.label} className="card-surface rounded-[24px] p-5">
            <p className="text-xs uppercase tracking-[0.22em] text-[var(--stroke-strong)]">
              {metric.label}
            </p>
            <p className="mt-3 text-3xl font-semibold text-[var(--foreground)]">
              {metric.value}
            </p>
            <p className="mt-3 text-sm leading-6 text-[var(--ink-soft)]">{metric.note}</p>
          </div>
        ))}
      </section>

      <SectionCard eyebrow="Aging" title="Receivables by aging bucket">
        {totalInvoices || snapshot.payments.length ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {aging.map((row) => (
              <div key={row.bucket} className="rounded-[20px] border border-[var(--stroke)] bg-white p-5">
                <p className="text-sm text-[var(--stroke-strong)]">{row.bucket}</p>
                <p className="mt-2 text-3xl font-semibold text-[var(--foreground)]">
                  {"isPercent" in row && row.isPercent
                    ? `${row.amount}%`
                    : formatCurrency(row.amount)}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            title="No analytics yet"
            copy="Once invoices and payments exist in the tenant, analytics will compute from real Supabase records."
          />
        )}
      </SectionCard>
    </div>
  );
}
