import Link from "next/link";
import { EmptyState } from "@/components/ui/empty-state";
import { SectionCard } from "@/components/ui/section-card";
import { StatusPill } from "@/components/ui/status-pill";
import {
  createInvoiceAutomationAction,
  runInvoiceAutomationsAction,
} from "@/app/(workspace)/invoices/automation-actions";
import { getMembershipContext } from "@/lib/company";
import { formatCurrency } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceSnapshot } from "@/lib/workspace-data";

function formatShortDate(value: string) {
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export default async function InvoicesPage() {
  const membership = await getMembershipContext();
  const snapshot = await getWorkspaceSnapshot();

  if (!snapshot || !membership) {
    return null;
  }

  const supabase = await createClient();
  const [{ data: automationsData }, { data: customersData }, { data: templatesData }] =
    await Promise.all([
      supabase
        .from("invoice_automations")
        .select(
          "id, name, automation_mode, cadence_days, next_run_date, auto_send, delivery_channel, is_active, customer:customers(name)",
        )
        .eq("company_id", membership.companyId)
        .order("next_run_date", { ascending: true })
        .limit(12),
      supabase
        .from("customers")
        .select("id, name")
        .eq("company_id", membership.companyId)
        .order("name"),
      supabase
        .from("invoice_templates")
        .select("id, name")
        .eq("company_id", membership.companyId)
        .order("name"),
    ]);

  const automations = (automationsData ?? []).map((automation) => ({
    ...automation,
    customer: Array.isArray(automation.customer)
      ? automation.customer[0] ?? null
      : automation.customer,
  })) as {
    id: string;
    name: string;
    automation_mode: string;
    cadence_days: number;
    next_run_date: string;
    auto_send: boolean;
    delivery_channel: string | null;
    is_active: boolean;
    customer: { name: string } | null;
  }[];
  const customers = (customersData ?? []) as { id: string; name: string }[];
  const templates = (templatesData ?? []) as { id: string; name: string }[];
  const today = new Date().toISOString().slice(0, 10);

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

      <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
        <SectionCard eyebrow="Automation" title="Automated invoice generation schedules">
          <div className="mb-4 flex items-center justify-between gap-3">
            <p className="text-sm text-[var(--ink-soft)]">
              Generate invoices from recurring, contract, and milestone schedules.
            </p>
            <form action={runInvoiceAutomationsAction}>
              <button type="submit" className="secondary-button">
                Run due schedules now
              </button>
            </form>
          </div>
          {automations.length ? (
            <div className="space-y-3">
              {automations.map((automation) => (
                <article key={automation.id} className="rounded-[20px] border border-[var(--stroke)] bg-white p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.18em] text-[var(--stroke-strong)]">
                        {automation.automation_mode}
                      </p>
                      <h3 className="mt-2 text-lg font-semibold text-[var(--foreground)]">
                        {automation.name}
                      </h3>
                      <p className="mt-1 text-sm text-[var(--ink-soft)]">
                        {automation.customer?.name ?? "Unknown customer"} · Every{" "}
                        {automation.cadence_days} day(s) · Next run{" "}
                        {formatShortDate(automation.next_run_date)}
                      </p>
                      <p className="mt-1 text-sm text-[var(--ink-soft)]">
                        Delivery {automation.delivery_channel ?? "manual"} ·{" "}
                        {automation.auto_send ? "auto-send enabled" : "manual send"}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <StatusPill label={automation.is_active ? "Healthy" : "Draft"} />
                      <form action={runInvoiceAutomationsAction}>
                        <input type="hidden" name="automationId" value={automation.id} />
                        <button type="submit" className="secondary-button px-3 py-2 text-xs">
                          Run now
                        </button>
                      </form>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <EmptyState
              title="No automation schedules"
              copy="Create at least one schedule to auto-generate invoices on a recurring cadence."
            />
          )}
        </SectionCard>

        <SectionCard eyebrow="Create" title="Add automation schedule">
          <form action={createInvoiceAutomationAction} className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="text-sm text-[var(--stroke-strong)]">Schedule name</label>
                <input name="name" required minLength={2} className="form-input mt-1" />
              </div>
              <div>
                <label className="text-sm text-[var(--stroke-strong)]">Customer</label>
                <select name="customerId" required className="form-select mt-1" defaultValue="">
                  <option value="" disabled>
                    Select customer
                  </option>
                  {customers.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="text-sm text-[var(--stroke-strong)]">Automation mode</label>
                <select name="automationMode" className="form-select mt-1" defaultValue="recurring">
                  <option value="recurring">Recurring</option>
                  <option value="contract">Contract</option>
                  <option value="milestone">Milestone</option>
                </select>
              </div>
              <div>
                <label className="text-sm text-[var(--stroke-strong)]">Template (optional)</label>
                <select name="templateId" className="form-select mt-1" defaultValue="">
                  <option value="">No template</option>
                  {templates.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="text-sm text-[var(--stroke-strong)]">Cadence (days)</label>
                <input
                  name="cadenceDays"
                  type="number"
                  required
                  min={1}
                  max={365}
                  defaultValue={30}
                  className="form-input mt-1"
                />
              </div>
              <div>
                <label className="text-sm text-[var(--stroke-strong)]">Next run date</label>
                <input
                  name="nextRunDate"
                  type="date"
                  required
                  defaultValue={today}
                  className="form-input mt-1"
                />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="text-sm text-[var(--stroke-strong)]">Delivery channel</label>
                <select name="deliveryChannel" className="form-select mt-1" defaultValue="email">
                  <option value="email">Email</option>
                  <option value="sms">SMS</option>
                  <option value="portal">Portal</option>
                  <option value="postal">Postal</option>
                </select>
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-2 text-sm text-[var(--foreground)]">
                  <input type="checkbox" name="autoSend" defaultChecked />
                  Auto-send generated invoices
                </label>
              </div>
            </div>
            <div>
              <label className="text-sm text-[var(--stroke-strong)]">Default notes</label>
              <input name="defaultNotes" className="form-input mt-1" />
            </div>
            <div>
              <label className="text-sm text-[var(--stroke-strong)]">
                Line items JSON
              </label>
              <textarea
                name="lineItemsJson"
                required
                rows={6}
                className="form-textarea mt-1 font-mono text-xs"
                defaultValue='[{"description":"Monthly service retainer","quantity":1,"unitPrice":2500,"taxRate":8.25}]'
              />
            </div>
            <button type="submit" className="primary-button w-full">
              Create automation schedule
            </button>
          </form>
        </SectionCard>
      </div>
    </div>
  );
}
