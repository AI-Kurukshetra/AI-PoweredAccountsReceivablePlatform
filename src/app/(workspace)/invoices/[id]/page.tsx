import Link from "next/link";
import { notFound } from "next/navigation";
import { EmptyState } from "@/components/ui/empty-state";
import { SectionCard } from "@/components/ui/section-card";
import { StatusPill } from "@/components/ui/status-pill";
import { getMembershipContext } from "@/lib/company";
import { formatCurrency } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

function firstRelation<T>(value: T | T[] | null): T | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

function formatShortDate(value: string) {
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const membership = await getMembershipContext();
  const routeParams = await params;

  if (!membership) {
    notFound();
  }

  const supabase = await createClient();
  const { data: invoice } = await supabase
    .from("invoices")
    .select(
      `
        id,
        invoice_number,
        status,
        issue_date,
        due_date,
        subtotal,
        tax_total,
        total_amount,
        balance_due,
        delivery_channel,
        notes,
        customer:customers(name, email)
      `,
    )
    .eq("company_id", membership.companyId)
    .eq("id", routeParams.id)
    .maybeSingle();

  if (!invoice) {
    notFound();
  }

  const [lineItemsResult, paymentsResult] = await Promise.all([
    supabase
      .from("invoice_line_items")
      .select("id, description, quantity, unit_price, tax_rate, line_total, sort_order")
      .eq("invoice_id", invoice.id)
      .order("sort_order", { ascending: true }),
    supabase
      .from("payments")
      .select("id, amount, channel, status, received_at, external_ref")
      .eq("invoice_id", invoice.id)
      .order("received_at", { ascending: false }),
  ]);

  const customer = firstRelation(invoice.customer);
  const lineItems = lineItemsResult.data ?? [];
  const payments = paymentsResult.data ?? [];

  return (
    <div className="space-y-5">
      <section className="card-surface rounded-[28px] p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-xs uppercase tracking-[0.24em] text-[var(--stroke-strong)]">
              Invoice detail
            </p>
            <h2 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-[var(--foreground)]">
              {invoice.invoice_number}
            </h2>
            <p className="mt-3 text-sm leading-6 text-[var(--ink-soft)]">
              {customer?.name ?? "Unknown customer"} · Due {formatShortDate(invoice.due_date)} ·{" "}
              {customer?.email ?? "No customer email"}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <StatusPill label={invoice.status} />
            <Link href="/payments/new" className="primary-button">
              Record payment
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="card-surface rounded-[22px] p-5">
          <p className="text-sm text-[var(--stroke-strong)]">Subtotal</p>
          <p className="mt-2 text-2xl font-semibold text-[var(--foreground)]">
            {formatCurrency(Number(invoice.subtotal))}
          </p>
        </div>
        <div className="card-surface rounded-[22px] p-5">
          <p className="text-sm text-[var(--stroke-strong)]">Tax</p>
          <p className="mt-2 text-2xl font-semibold text-[var(--foreground)]">
            {formatCurrency(Number(invoice.tax_total))}
          </p>
        </div>
        <div className="card-surface rounded-[22px] p-5">
          <p className="text-sm text-[var(--stroke-strong)]">Invoice total</p>
          <p className="mt-2 text-2xl font-semibold text-[var(--foreground)]">
            {formatCurrency(Number(invoice.total_amount))}
          </p>
        </div>
        <div className="card-surface rounded-[22px] p-5">
          <p className="text-sm text-[var(--stroke-strong)]">Balance due</p>
          <p className="mt-2 text-2xl font-semibold text-[var(--foreground)]">
            {formatCurrency(Number(invoice.balance_due))}
          </p>
        </div>
      </section>

      {invoice.notes ? (
        <SectionCard eyebrow="Notes" title="Invoice notes">
          <div className="rounded-[20px] border border-[var(--stroke)] bg-white px-5 py-4 text-sm leading-7 text-[var(--ink-soft)]">
            {invoice.notes}
          </div>
        </SectionCard>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
        <SectionCard eyebrow="Line items" title="Invoice composition">
          {lineItems.length ? (
            <div className="space-y-3">
              {lineItems.map((item) => (
                <div
                  key={item.id}
                  className="grid gap-3 rounded-[20px] border border-[var(--stroke)] bg-white px-5 py-4 md:grid-cols-[1.4fr_0.5fr_0.7fr_0.5fr_0.8fr]"
                >
                  <div>
                    <p className="text-sm font-medium text-[var(--foreground)]">
                      {item.description}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-[var(--stroke-strong)]">
                      Qty
                    </p>
                    <p className="mt-2 text-sm text-[var(--foreground)]">
                      {Number(item.quantity)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-[var(--stroke-strong)]">
                      Unit
                    </p>
                    <p className="mt-2 text-sm text-[var(--foreground)]">
                      {formatCurrency(Number(item.unit_price))}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-[var(--stroke-strong)]">
                      Tax
                    </p>
                    <p className="mt-2 text-sm text-[var(--foreground)]">
                      {Number(item.tax_rate)}%
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-[var(--stroke-strong)]">
                      Line total
                    </p>
                    <p className="mt-2 text-sm font-medium text-[var(--foreground)]">
                      {formatCurrency(Number(item.line_total))}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title="No line items stored"
              copy="This invoice was created without itemized rows and relies on the fallback total."
            />
          )}
        </SectionCard>

        <SectionCard eyebrow="Payments" title="Applied receipts">
          {payments.length ? (
            <div className="space-y-3">
              {payments.map((payment) => (
                <div
                  key={payment.id}
                  className="rounded-[20px] border border-[var(--stroke)] bg-white px-4 py-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium text-[var(--foreground)]">
                      {payment.external_ref ?? payment.id.slice(0, 8)}
                    </p>
                    <StatusPill label={payment.status} />
                  </div>
                  <div className="mt-3 grid gap-2 text-sm text-[var(--ink-soft)]">
                    <p>Amount: {formatCurrency(Number(payment.amount))}</p>
                    <p>Channel: {payment.channel}</p>
                    <p>
                      Received:{" "}
                      {payment.received_at
                        ? new Date(payment.received_at).toLocaleString("en-US", {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "Not recorded"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title="No payments applied"
              copy="Record a payment to reduce the balance due and start reconciliation history."
            />
          )}
        </SectionCard>
      </div>
    </div>
  );
}
