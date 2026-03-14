import Link from "next/link";
import { EmptyState } from "@/components/ui/empty-state";
import { SectionCard } from "@/components/ui/section-card";
import { StatusPill } from "@/components/ui/status-pill";
import { updatePortalAccessAction } from "@/app/(workspace)/portal/actions";
import { getMembershipContext } from "@/lib/company";
import { formatCurrency } from "@/lib/format";
import { buildPortalUrl } from "@/lib/portal";
import { createClient } from "@/lib/supabase/server";

type CustomerRow = {
  id: string;
  name: string;
  email: string | null;
  external_ref: string | null;
  portal_enabled: boolean;
  portal_access_token: string | null;
};

type InvoiceRow = {
  customer_id: string;
  balance_due: number;
  status: string;
};

type GatewayRow = {
  provider: string;
  status: string;
  supported_channels: string[] | null;
  checkout_url: string | null;
};

export default async function PortalPage() {
  const membership = await getMembershipContext();

  if (!membership) {
    return null;
  }

  const supabase = await createClient();
  const [{ data: customersData }, { data: invoicesData }, { data: gatewaysData }] = await Promise.all([
    supabase
      .from("customers")
      .select("id, name, email, external_ref, portal_enabled, portal_access_token")
      .eq("company_id", membership.companyId)
      .order("name"),
    supabase
      .from("invoices")
      .select("customer_id, balance_due, status")
      .eq("company_id", membership.companyId),
    supabase
      .from("payment_gateway_accounts")
      .select("provider, status, supported_channels, checkout_url")
      .eq("company_id", membership.companyId),
  ]);

  const customers = (customersData ?? []) as CustomerRow[];
  const invoices = (invoicesData ?? []) as InvoiceRow[];
  const gateways = (gatewaysData ?? []) as GatewayRow[];
  const activeGateway = gateways.find((gateway) => ["live", "configured"].includes(gateway.status));

  const invoiceStats = new Map<
    string,
    { openBalance: number; openInvoices: number; paidInvoices: number }
  >();

  for (const invoice of invoices) {
    const current = invoiceStats.get(invoice.customer_id) ?? {
      openBalance: 0,
      openInvoices: 0,
      paidInvoices: 0,
    };

    current.openBalance += Number(invoice.balance_due);
    if (Number(invoice.balance_due) > 0) {
      current.openInvoices += 1;
    }
    if (invoice.status === "paid") {
      current.paidInvoices += 1;
    }

    invoiceStats.set(invoice.customer_id, current);
  }

  return (
    <div className="space-y-5">
      <section className="card-surface rounded-[28px] p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-xs uppercase tracking-[0.24em] text-[var(--stroke-strong)]">
              Portal
            </p>
            <h2 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-[var(--foreground)]">
              Enable customer self-service links for invoice visibility and payment history.
            </h2>
            <p className="mt-3 text-sm leading-6 text-[var(--ink-soft)]">
              This module covers the blueprint&apos;s customer payment portal requirement with a hosted customer view driven by portal tokens.
            </p>
            {activeGateway ? (
              <div className="mt-4 rounded-[18px] border border-[var(--stroke)] bg-white px-4 py-3 text-sm text-[var(--foreground)]">
                Online payments are backed by {activeGateway.provider} for {(activeGateway.supported_channels ?? []).join(", ")}.
              </div>
            ) : null}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="soft-panel rounded-xl px-4 py-3 text-sm">
              <p className="text-[var(--stroke-strong)]">Portal-enabled</p>
              <p className="mt-1 font-semibold text-[var(--foreground)]">
                {customers.filter((customer) => customer.portal_enabled).length}
              </p>
            </div>
            <div className="soft-panel rounded-xl px-4 py-3 text-sm">
              <p className="text-[var(--stroke-strong)]">Customer accounts</p>
              <p className="mt-1 font-semibold text-[var(--foreground)]">{customers.length}</p>
            </div>
          </div>
        </div>
      </section>

      <SectionCard eyebrow="Customers" title="Portal access by account">
        {customers.length ? (
          <div className="grid gap-4 lg:grid-cols-2">
            {customers.map((customer) => {
              const stats = invoiceStats.get(customer.id) ?? {
                openBalance: 0,
                openInvoices: 0,
                paidInvoices: 0,
              };

              return (
                <article key={customer.id} className="soft-panel rounded-[24px] p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.18em] text-[var(--stroke-strong)]">
                        {customer.external_ref ?? customer.id.slice(0, 8)}
                      </p>
                      <h3 className="mt-2 text-xl font-semibold text-[var(--foreground)]">
                        {customer.name}
                      </h3>
                      <p className="mt-1 text-sm text-[var(--ink-soft)]">
                        {customer.email ?? "No customer email"}
                      </p>
                    </div>
                    <StatusPill label={customer.portal_enabled ? "Healthy" : "Draft"} />
                  </div>

                  <div className="mt-5 grid gap-4 sm:grid-cols-3">
                    <div>
                      <p className="text-sm text-[var(--stroke-strong)]">Open invoices</p>
                      <p className="mt-1 text-xl font-semibold text-[var(--foreground)]">
                        {stats.openInvoices}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-[var(--stroke-strong)]">Open balance</p>
                      <p className="mt-1 text-xl font-semibold text-[var(--foreground)]">
                        {formatCurrency(stats.openBalance)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-[var(--stroke-strong)]">Paid invoices</p>
                      <p className="mt-1 text-xl font-semibold text-[var(--foreground)]">
                        {stats.paidInvoices}
                      </p>
                    </div>
                  </div>

                  {customer.portal_enabled && customer.portal_access_token ? (
                    <div className="mt-5 rounded-[18px] border border-[var(--stroke)] bg-white px-4 py-3">
                      <p className="text-xs uppercase tracking-[0.18em] text-[var(--stroke-strong)]">
                        Hosted portal
                      </p>
                      <Link
                        href={buildPortalUrl(customer.portal_access_token)}
                        target="_blank"
                        className="mt-2 block break-all text-sm font-medium text-[var(--brand)]"
                      >
                        {buildPortalUrl(customer.portal_access_token)}
                      </Link>
                    </div>
                  ) : null}

                  <div className="mt-5 flex flex-wrap gap-3">
                    <form action={updatePortalAccessAction}>
                      <input type="hidden" name="customerId" value={customer.id} />
                      <input
                        type="hidden"
                        name="intent"
                        value={customer.portal_enabled ? "disable" : "enable"}
                      />
                      <button type="submit" className="secondary-button">
                        {customer.portal_enabled ? "Disable portal" : "Enable portal"}
                      </button>
                    </form>
                    <form action={updatePortalAccessAction}>
                      <input type="hidden" name="customerId" value={customer.id} />
                      <input type="hidden" name="intent" value="rotate" />
                      <button
                        type="submit"
                        className="secondary-button"
                        disabled={!customer.portal_enabled}
                      >
                        Rotate link
                      </button>
                    </form>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <EmptyState
            title="No customers available"
            copy="Create customer accounts first, then enable self-service portal access for the accounts that should see invoice and payment history."
          />
        )}
      </SectionCard>
    </div>
  );
}
