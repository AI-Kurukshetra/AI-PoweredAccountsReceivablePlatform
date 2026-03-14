import Link from "next/link";
import { createPaymentAction } from "@/app/(workspace)/payments/actions";
import { PaymentForm } from "@/components/workspace/payment-form";
import { EmptyState } from "@/components/ui/empty-state";
import { SectionCard } from "@/components/ui/section-card";
import { getWorkspaceSnapshot } from "@/lib/workspace-data";

export default async function NewPaymentPage() {
  const snapshot = await getWorkspaceSnapshot();

  if (!snapshot) {
    return null;
  }

  const openInvoices = snapshot.invoices.filter(
    (invoice) => Number(invoice.balance_due) > 0,
  );

  return (
    <div className="space-y-5">
      <section className="card-surface rounded-[28px] p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-xs uppercase tracking-[0.24em] text-[var(--stroke-strong)]">
              New payment
            </p>
            <h2 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-[var(--foreground)]">
              Record a receipt and reconcile it to the right invoice in one step.
            </h2>
            <p className="mt-3 text-sm leading-6 text-[var(--ink-soft)]">
              Settled payments reduce balance immediately, so this screen should stay fast and uncluttered.
            </p>
          </div>
          <Link href="/payments" className="secondary-button">
            Back to payments
          </Link>
        </div>
      </section>

      <SectionCard eyebrow="Payments" title="Record payment and reconcile invoice">
        {openInvoices.length ? (
          <PaymentForm
            invoices={openInvoices.map((invoice) => ({
              id: invoice.id,
              invoiceNumber: invoice.invoice_number,
              customerName: invoice.customer?.name ?? "Unknown",
              balanceDue: Number(invoice.balance_due),
            }))}
            action={createPaymentAction}
          />
        ) : (
          <EmptyState
            title="No open invoices to reconcile"
            copy="Create an invoice with a remaining balance first, then return here to record payment."
          />
        )}
      </SectionCard>
    </div>
  );
}
