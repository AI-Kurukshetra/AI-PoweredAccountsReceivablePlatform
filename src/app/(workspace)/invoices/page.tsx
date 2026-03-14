import Link from "next/link";
import { EmptyState } from "@/components/ui/empty-state";
import { SectionCard } from "@/components/ui/section-card";
import { StatusPill } from "@/components/ui/status-pill";
import { formatCurrency } from "@/lib/format";
import { getWorkspaceSnapshot } from "@/lib/workspace-data";

function formatShortDate(value: string) {
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export default async function InvoicesPage() {
  const snapshot = await getWorkspaceSnapshot();

  if (!snapshot) {
    return null;
  }

  const totalOpen = snapshot.invoices.reduce(
    (sum, invoice) => sum + Number(invoice.balance_due),
    0,
  );
  const overdueCount = snapshot.invoices.filter(
    (invoice) => invoice.status === "overdue" || invoice.status === "disputed",
  ).length;

  return (
    <div className="space-y-5">
      <section className="card-surface rounded-[28px] p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-xs uppercase tracking-[0.24em] text-[var(--stroke-strong)]">
              Invoice ledger
            </p>
            <h2 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-[var(--foreground)]">
              Review status, due dates, and open balance without leaving the main ledger.
            </h2>
            <p className="mt-3 text-sm leading-6 text-[var(--ink-soft)]">
              The table is denser and easier to scan, matching the dashboard layout.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="soft-panel rounded-xl px-4 py-3 text-sm">
              <p className="text-[var(--stroke-strong)]">Open balance</p>
              <p className="mt-1 font-semibold text-[var(--foreground)]">
                {formatCurrency(totalOpen)}
              </p>
            </div>
            <div className="soft-panel rounded-xl px-4 py-3 text-sm">
              <p className="text-[var(--stroke-strong)]">Exceptions</p>
              <p className="mt-1 font-semibold text-[var(--foreground)]">{overdueCount}</p>
            </div>
            <Link href="/invoices/new" className="primary-button">
              New invoice
            </Link>
          </div>
        </div>
      </section>

      <SectionCard eyebrow="Invoices" title="Invoice ledger and delivery state">
        {snapshot.invoices.length ? (
          <div className="table-shell overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-[var(--stroke)] bg-[var(--surface-muted)]/65 text-[var(--stroke-strong)]">
                <tr>
                  <th className="px-5 py-4 font-medium">Invoice</th>
                  <th className="px-5 py-4 font-medium">Customer</th>
                  <th className="px-5 py-4 font-medium">Issued</th>
                  <th className="px-5 py-4 font-medium">Due</th>
                  <th className="px-5 py-4 font-medium">Amount</th>
                  <th className="px-5 py-4 font-medium">Open balance</th>
                  <th className="px-5 py-4 font-medium">Channel</th>
                  <th className="px-5 py-4 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--stroke)]">
                {snapshot.invoices.map((invoice) => (
                  <tr key={invoice.id} className="table-row-soft">
                    <td className="px-5 py-4 font-medium text-[var(--foreground)]">
                      <Link href={`/invoices/${invoice.id}`} className="hover:text-[var(--brand)]">
                        {invoice.invoice_number}
                      </Link>
                    </td>
                    <td className="px-5 py-4">{invoice.customer?.name ?? "Unknown"}</td>
                    <td className="px-5 py-4">{formatShortDate(invoice.issue_date)}</td>
                    <td className="px-5 py-4">{formatShortDate(invoice.due_date)}</td>
                    <td className="px-5 py-4">{formatCurrency(Number(invoice.total_amount))}</td>
                    <td className="px-5 py-4">{formatCurrency(Number(invoice.balance_due))}</td>
                    <td className="px-5 py-4 capitalize">
                      {invoice.delivery_channel ?? "manual"}
                    </td>
                    <td className="px-5 py-4">
                      <StatusPill label={invoice.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title="No invoices in this company"
            copy="Create or import invoices into Supabase and they will appear here."
          />
        )}
      </SectionCard>
    </div>
  );
}
