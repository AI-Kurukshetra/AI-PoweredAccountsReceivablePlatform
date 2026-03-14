import Link from "next/link";
import { AlertTriangle, ArrowRight, CircleDollarSign, Clock3, ShieldAlert } from "lucide-react";
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

export default async function DashboardPage() {
  const snapshot = await getWorkspaceSnapshot();

  if (!snapshot) {
    return null;
  }

  const overdueInvoices = snapshot.invoices.filter(
    (invoice) => invoice.status === "overdue" || invoice.status === "disputed",
  );
  const openReceivables = snapshot.invoices.reduce(
    (sum, invoice) => sum + Number(invoice.balance_due),
    0,
  );
  const openCount = snapshot.invoices.filter(
    (invoice) => Number(invoice.balance_due) > 0,
  ).length;
  const unsettledPayments = snapshot.payments.filter(
    (payment) => payment.status !== "settled",
  ).length;

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="inline-flex items-center gap-2 rounded-full bg-[var(--danger-soft)] px-3 py-2 text-sm font-medium text-[var(--danger)]">
          <AlertTriangle className="h-4 w-4" />
          {overdueInvoices.length
            ? `${overdueInvoices.length} invoices need immediate attention`
            : "No critical receivables risk right now"}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/invoices/new"
            className="rounded-xl bg-[var(--surface-strong)] px-4 py-2.5 text-sm font-medium text-white"
          >
            New invoice
          </Link>
          <Link
            href="/analytics"
            className="rounded-xl border border-[var(--stroke)] bg-white px-4 py-2.5 text-sm font-medium text-[var(--foreground)]"
          >
            Analytics
          </Link>
        </div>
      </div>

      <section className="grid gap-4 xl:grid-cols-[1.1fr_1.1fr_1fr]">
        <div className="card-surface rounded-[24px] p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--brand-soft)] text-[var(--brand)]">
              <CircleDollarSign className="h-5 w-5" />
            </div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--stroke-strong)]">
              Open receivables
            </p>
          </div>
          <p className="mt-6 text-5xl font-semibold tracking-[-0.05em] text-[var(--foreground)]">
            {formatCurrency(openReceivables)}
          </p>
          <p className="mt-3 text-sm leading-6 text-[var(--ink-soft)]">
            {openCount} invoices still carry balance in the active company workspace.
          </p>
        </div>

        <div className="card-surface rounded-[24px] p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--accent-soft)] text-[#b17a19]">
              <Clock3 className="h-5 w-5" />
            </div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--stroke-strong)]">
              Reminder coverage
            </p>
          </div>
          <p className="mt-6 text-5xl font-semibold tracking-[-0.05em] text-[var(--foreground)]">
            {snapshot.reminderCoverage}%
          </p>
          <p className="mt-3 text-sm leading-6 text-[var(--ink-soft)]">
            {snapshot.reminders.length} reminders mapped against your active invoice book.
          </p>
        </div>

        <div className="card-surface rounded-[24px] p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--danger-soft)] text-[var(--danger)]">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--stroke-strong)]">
              Exceptions
            </p>
          </div>
          <div className="mt-6 flex items-end gap-6">
            <div>
              <p className="text-4xl font-semibold tracking-[-0.04em] text-[var(--foreground)]">
                {overdueInvoices.length}
              </p>
              <p className="mt-2 text-sm text-[var(--ink-soft)]">Overdue or disputed</p>
            </div>
            <div>
              <p className="text-4xl font-semibold tracking-[-0.04em] text-[var(--foreground)]">
                {unsettledPayments}
              </p>
              <p className="mt-2 text-sm text-[var(--ink-soft)]">Pending receipts</p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.25fr_0.95fr]">
        <SectionCard eyebrow="Ledger overview" title="Recent invoices">
          {snapshot.invoices.length ? (
            <div className="table-shell overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-[var(--stroke)] bg-[var(--surface-muted)]/70 text-[var(--stroke-strong)]">
                  <tr>
                    <th className="px-5 py-4 font-medium">Invoice</th>
                    <th className="px-5 py-4 font-medium">Customer</th>
                    <th className="px-5 py-4 font-medium">Due</th>
                    <th className="px-5 py-4 font-medium">Balance</th>
                    <th className="px-5 py-4 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--stroke)]">
                  {snapshot.invoices.slice(0, 6).map((invoice) => (
                    <tr key={invoice.id} className="table-row-soft">
                      <td className="px-5 py-4 font-medium text-[var(--foreground)]">
                        <Link href={`/invoices/${invoice.id}`} className="hover:text-[var(--brand)]">
                          {invoice.invoice_number}
                        </Link>
                      </td>
                      <td className="px-5 py-4">{invoice.customer?.name ?? "Unknown customer"}</td>
                      <td className="px-5 py-4">{formatShortDate(invoice.due_date)}</td>
                      <td className="px-5 py-4">{formatCurrency(Number(invoice.balance_due))}</td>
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
              title="No invoices yet"
              copy="Create your first invoice and the main ledger table will appear here."
            />
          )}
        </SectionCard>

        <SectionCard eyebrow="Collections" title="Reminder queue">
          {snapshot.reminders.length ? (
            <div className="space-y-3">
              {snapshot.reminders.slice(0, 4).map((flow) => (
                <div key={flow.id} className="soft-panel rounded-[20px] px-4 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-[var(--foreground)]">
                        {flow.customer?.name ?? "Unknown customer"}
                      </p>
                      <p className="mt-1 text-sm text-[var(--ink-soft)]">
                        {flow.invoice?.invoice_number ?? "No invoice linked"} · {flow.channel}
                      </p>
                    </div>
                    <StatusPill label={flow.status} />
                  </div>
                  <p className="mt-3 text-sm text-[var(--ink-soft)]">
                    {flow.stage} scheduled for{" "}
                    {new Date(flow.scheduled_for).toLocaleString("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title="No reminder sequences"
              copy="Reminder cadence records will appear here once you start scheduling follow-ups."
            />
          )}
        </SectionCard>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.25fr_0.95fr]">
        <SectionCard eyebrow="Recent activity" title="Operational timeline">
          {snapshot.auditLogs.length ? (
            <div className="space-y-3">
              {snapshot.auditLogs.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-start justify-between gap-4 rounded-[20px] border border-[var(--stroke)] bg-white px-4 py-4"
                >
                  <div>
                    <p className="font-medium text-[var(--foreground)]">
                      {activity.entity_type} · {activity.action}
                    </p>
                    <p className="mt-1 text-sm text-[var(--ink-soft)]">
                      {(activity.details?.message as string | undefined) ??
                        "Workspace activity recorded."}
                    </p>
                  </div>
                  <p className="shrink-0 text-sm text-[var(--stroke-strong)]">
                    {formatShortDate(activity.created_at)}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title="No audit activity yet"
              copy="Company creation, invoice events, and payment operations will show here."
            />
          )}
        </SectionCard>

        <SectionCard eyebrow="Connections" title="System status">
          <div className="space-y-3">
            <div className="soft-panel rounded-[20px] px-4 py-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-[var(--foreground)]">Supabase Auth</p>
                  <p className="mt-1 text-sm text-[var(--ink-soft)]">
                    Session, route protection, and onboarding are active.
                  </p>
                </div>
                <StatusPill label="Healthy" />
              </div>
            </div>

            <div className="soft-panel rounded-[20px] px-4 py-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-[var(--foreground)]">Workspace DB</p>
                  <p className="mt-1 text-sm text-[var(--ink-soft)]">
                    Customers, invoices, reminders, and payments are live.
                  </p>
                </div>
                <StatusPill label="Healthy" />
              </div>
            </div>

            <Link
              href="/analytics"
              className="flex items-center justify-between rounded-[20px] border border-[var(--stroke)] bg-[var(--surface-muted)]/65 px-4 py-4 text-sm font-medium text-[var(--foreground)]"
            >
              View detailed analytics
              <ArrowRight className="h-4 w-4 text-[var(--brand)]" />
            </Link>
          </div>
        </SectionCard>
      </section>
    </div>
  );
}
