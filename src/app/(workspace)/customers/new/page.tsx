import Link from "next/link";
import { createCustomerAction } from "@/app/(workspace)/customers/actions";
import { CustomerForm } from "@/components/workspace/customer-form";
import { SectionCard } from "@/components/ui/section-card";

export default function NewCustomerPage() {
  return (
    <div className="space-y-5">
      <section className="card-surface rounded-[28px] p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-xs uppercase tracking-[0.24em] text-[var(--stroke-strong)]">
              New customer
            </p>
            <h2 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-[var(--foreground)]">
              Add a clean customer record before issuing invoices or setting follow-up rules.
            </h2>
            <p className="mt-3 text-sm leading-6 text-[var(--ink-soft)]">
              Keep the setup simple: who they are, what terms they receive, and who owns the relationship.
            </p>
          </div>
          <Link href="/customers" className="secondary-button">
            Back to customers
          </Link>
        </div>
      </section>

      <SectionCard eyebrow="Customers" title="Create customer">
        <CustomerForm action={createCustomerAction} />
      </SectionCard>
    </div>
  );
}
