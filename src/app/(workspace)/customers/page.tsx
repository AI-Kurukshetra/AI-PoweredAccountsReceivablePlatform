import Link from "next/link";
import { EmptyState } from "@/components/ui/empty-state";
import { SectionCard } from "@/components/ui/section-card";
import { StatusPill } from "@/components/ui/status-pill";
import { getWorkspaceSnapshot } from "@/lib/workspace-data";
import { formatCurrency } from "@/lib/format";

export default async function CustomersPage() {
  const snapshot = await getWorkspaceSnapshot();

  if (!snapshot) {
    return null;
  }

  const totalCredit = snapshot.customers.reduce(
    (sum, customer) => sum + Number(customer.credit_limit),
    0,
  );
  const highRiskCount = snapshot.customers.filter((customer) => {
    const risk = (customer.metadata?.risk as string | undefined)?.toLowerCase();
    return risk === "high";
  }).length;

  return (
    <div className="space-y-5">
      <section className="card-surface rounded-[32px] p-6 sm:p-7">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-2xl">
            <p className="text-[11px] uppercase tracking-[0.28em] text-[var(--stroke-strong)]">
              Customer book
            </p>
            <h2 className="balanced-copy mt-3 text-3xl font-semibold tracking-[-0.04em] text-[var(--foreground)]">
              Keep account owners, terms, and credit exposure visible before invoices go out.
            </h2>
            <p className="mt-3 text-sm leading-6 text-[var(--ink-soft)]">
              Customer cards are denser now so the page reads like a working CRM instead of a long report.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="soft-panel rounded-full px-4 py-2 text-sm font-medium text-[var(--foreground)]">
              {snapshot.customers.length} accounts
            </div>
            <Link
              href="/customers/new"
              className="primary-button"
            >
              New customer
            </Link>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <div className="tinted-panel rounded-[24px] px-4 py-4">
            <p className="text-xs uppercase tracking-[0.22em] text-[var(--stroke-strong)]">
              Total credit
            </p>
            <p className="mt-2 text-2xl font-semibold text-[var(--foreground)]">
              {formatCurrency(totalCredit)}
            </p>
          </div>
          <div className="soft-panel rounded-[24px] px-4 py-4">
            <p className="text-xs uppercase tracking-[0.22em] text-[var(--stroke-strong)]">
              High risk
            </p>
            <p className="mt-2 text-2xl font-semibold text-[var(--foreground)]">
              {highRiskCount}
            </p>
          </div>
          <div className="soft-panel rounded-[24px] px-4 py-4">
            <p className="text-xs uppercase tracking-[0.22em] text-[var(--stroke-strong)]">
              Avg terms
            </p>
            <p className="mt-2 text-2xl font-semibold text-[var(--foreground)]">
              {snapshot.customers.length
                ? Math.round(
                    snapshot.customers.reduce(
                      (sum, customer) => sum + customer.payment_terms_days,
                      0,
                    ) / snapshot.customers.length,
                  )
                : 0}{" "}
              days
            </p>
          </div>
        </div>
      </section>

      <SectionCard eyebrow="Customers" title="Credit exposure and account ownership">
        {snapshot.customers.length ? (
          <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
            {snapshot.customers.map((customer) => (
              <div key={customer.id} className="soft-panel rounded-[24px] p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-[var(--stroke-strong)]">
                      {customer.external_ref ?? customer.id.slice(0, 8)}
                    </p>
                    <h3 className="mt-2 text-xl font-semibold text-[var(--foreground)]">
                      {customer.name}
                    </h3>
                    <p className="mt-1 text-sm text-[var(--ink-soft)]">
                      {customer.segment ?? "General"} · Net {customer.payment_terms_days} ·{" "}
                      {(customer.metadata?.owner as string | undefined) ?? "Unassigned"}
                    </p>
                  </div>
                  <StatusPill
                    label={(customer.metadata?.risk as string | undefined) ?? "Medium"}
                  />
                </div>
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-sm text-[var(--ink-soft)]">Email</p>
                    <p className="mt-1 text-sm font-semibold text-[var(--foreground)]">
                      {customer.email ?? "No email"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-[var(--ink-soft)]">Credit limit</p>
                    <p className="mt-1 text-2xl font-semibold text-[var(--foreground)]">
                      {formatCurrency(Number(customer.credit_limit))}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            title="No customers yet"
            copy="Add customers to begin issuing invoices and tracking payment behavior."
          />
        )}
      </SectionCard>
    </div>
  );
}
