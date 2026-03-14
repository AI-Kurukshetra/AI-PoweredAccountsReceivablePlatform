import Link from "next/link";
import { redirect } from "next/navigation";
import { createInvoiceAction } from "@/app/(workspace)/invoices/actions";
import { InvoiceForm } from "@/components/workspace/invoice-form";
import { EmptyState } from "@/components/ui/empty-state";
import { SectionCard } from "@/components/ui/section-card";
import { getWorkspaceSnapshot } from "@/lib/workspace-data";

export default async function NewInvoicePage() {
  const snapshot = await getWorkspaceSnapshot();

  if (!snapshot) {
    redirect("/onboarding");
  }

  return (
    <div className="space-y-5">
      <section className="card-surface rounded-[28px] p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-xs uppercase tracking-[0.24em] text-[var(--stroke-strong)]">
              New invoice
            </p>
            <h2 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-[var(--foreground)]">
              Build an invoice with line items, clean totals, and a delivery-ready record.
            </h2>
            <p className="mt-3 text-sm leading-6 text-[var(--ink-soft)]">
              The form now matches the main workspace styling instead of feeling like a separate admin tool.
            </p>
          </div>
          <Link href="/invoices" className="secondary-button">
            Back to invoices
          </Link>
        </div>
      </section>

      <SectionCard eyebrow="Invoices" title="Create invoice">
        {snapshot.customers.length ? (
          <InvoiceForm
            customers={snapshot.customers.map((customer) => ({
              id: customer.id,
              name: customer.name,
            }))}
            action={createInvoiceAction}
          />
        ) : (
          <EmptyState
            title="Create a customer first"
            copy="Invoices need a customer record. Add one in the customers section, then return here."
          />
        )}
      </SectionCard>
    </div>
  );
}
