import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatCurrency } from "@/lib/format";

type CompanyRow = {
  name: string;
  base_currency: string;
};

type InvoiceRow = {
  id: string;
  invoice_number: string;
  status: string;
  total_amount: number;
  balance_due: number;
  due_date: string;
  issue_date: string;
};

type PaymentRow = {
  id: string;
  amount: number;
  status: string;
  channel: string;
  received_at: string | null;
};

type GatewayRow = {
  provider: string;
  status: string;
  supported_channels: string[] | null;
  checkout_url: string | null;
};

export default async function CustomerPortalPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const admin = createAdminClient();

  const { data: customer } = await admin
    .from("customers")
    .select("id, name, email, company_id, portal_enabled")
    .eq("portal_access_token", token)
    .eq("portal_enabled", true)
    .maybeSingle();

  if (!customer) {
    notFound();
  }

  const [{ data: company }, { data: invoicesData }, { data: paymentsData }, { data: gatewayData }] = await Promise.all([
    admin
      .from("companies")
      .select("name, base_currency")
      .eq("id", customer.company_id)
      .maybeSingle(),
    admin
      .from("invoices")
      .select("id, invoice_number, status, total_amount, balance_due, due_date, issue_date")
      .eq("customer_id", customer.id)
      .order("due_date"),
    admin
      .from("payments")
      .select("id, amount, status, channel, received_at")
      .eq("customer_id", customer.id)
      .order("received_at", { ascending: false }),
    admin
      .from("payment_gateway_accounts")
      .select("provider, status, supported_channels, checkout_url")
      .eq("company_id", customer.company_id),
  ]);

  const invoices = (invoicesData ?? []) as InvoiceRow[];
  const payments = (paymentsData ?? []) as PaymentRow[];
  const gateways = (gatewayData ?? []) as GatewayRow[];
  const openBalance = invoices.reduce((sum, invoice) => sum + Number(invoice.balance_due), 0);
  const companyInfo = company as CompanyRow | null;
  const activeGateway = gateways.find((gateway) => ["live", "configured"].includes(gateway.status));

  return (
    <div className="app-shell min-h-screen px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <section className="card-surface rounded-[36px] p-8">
          <p className="text-xs uppercase tracking-[0.28em] text-[var(--stroke-strong)]">
            Customer portal
          </p>
          <div className="mt-4 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-4xl font-semibold tracking-[-0.04em] text-[var(--foreground)]">
                {customer.name}
              </h1>
              <p className="mt-3 text-sm leading-7 text-[var(--ink-soft)]">
                {companyInfo?.name ?? "Company workspace"} · {customer.email ?? "No email on file"}
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="soft-panel rounded-xl px-4 py-3 text-sm">
                <p className="text-[var(--stroke-strong)]">Open balance</p>
                <p className="mt-1 font-semibold text-[var(--foreground)]">
                  {formatCurrency(openBalance)}
                </p>
              </div>
              <div className="soft-panel rounded-xl px-4 py-3 text-sm">
                <p className="text-[var(--stroke-strong)]">Invoices</p>
                <p className="mt-1 font-semibold text-[var(--foreground)]">{invoices.length}</p>
              </div>
              <div className="soft-panel rounded-xl px-4 py-3 text-sm">
                <p className="text-[var(--stroke-strong)]">Payments</p>
                <p className="mt-1 font-semibold text-[var(--foreground)]">{payments.length}</p>
              </div>
            </div>
          </div>
        </section>

        <div className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
          <section className="card-surface rounded-[30px] p-6">
            <p className="text-xs uppercase tracking-[0.24em] text-[var(--stroke-strong)]">
              Invoices
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-[var(--foreground)]">
              Outstanding and historical invoices
            </h2>
            <div className="mt-5 space-y-3">
              {invoices.length ? (
                invoices.map((invoice) => (
                  <article
                    key={invoice.id}
                    className="rounded-[22px] border border-[var(--stroke)] bg-white p-5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs uppercase tracking-[0.18em] text-[var(--stroke-strong)]">
                          {invoice.status}
                        </p>
                        <h3 className="mt-2 text-lg font-semibold text-[var(--foreground)]">
                          {invoice.invoice_number}
                        </h3>
                      </div>
                      <p className="text-lg font-semibold text-[var(--foreground)]">
                        {formatCurrency(Number(invoice.balance_due))}
                      </p>
                    </div>
                    <div className="mt-4 grid gap-3 md:grid-cols-3 text-sm text-[var(--ink-soft)]">
                      <p>Issued {new Date(invoice.issue_date).toLocaleDateString("en-US")}</p>
                      <p>Due {new Date(invoice.due_date).toLocaleDateString("en-US")}</p>
                      <p>Total {formatCurrency(Number(invoice.total_amount))}</p>
                    </div>
                  </article>
                ))
              ) : (
                <div className="rounded-[22px] border border-dashed border-[var(--stroke)] bg-white px-5 py-12 text-center text-sm text-[var(--ink-soft)]">
                  No invoices are visible in this portal.
                </div>
              )}
            </div>
          </section>

          <section className="card-surface rounded-[30px] p-6">
            <p className="text-xs uppercase tracking-[0.24em] text-[var(--stroke-strong)]">
              Payments
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-[var(--foreground)]">
              Payment history
            </h2>
            <div className="mt-5 space-y-3">
              {payments.length ? (
                payments.map((payment) => (
                  <article
                    key={payment.id}
                    className="rounded-[22px] border border-[var(--stroke)] bg-white p-5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs uppercase tracking-[0.18em] text-[var(--stroke-strong)]">
                          {payment.status}
                        </p>
                        <h3 className="mt-2 text-lg font-semibold text-[var(--foreground)]">
                          {formatCurrency(Number(payment.amount))}
                        </h3>
                      </div>
                      <p className="text-sm capitalize text-[var(--ink-soft)]">
                        {payment.channel}
                      </p>
                    </div>
                    <p className="mt-4 text-sm text-[var(--ink-soft)]">
                      {payment.received_at
                        ? `Received ${new Date(payment.received_at).toLocaleString("en-US")}`
                        : "Payment not yet received"}
                    </p>
                  </article>
                ))
              ) : (
                <div className="rounded-[22px] border border-dashed border-[var(--stroke)] bg-white px-5 py-12 text-center text-sm text-[var(--ink-soft)]">
                  No payment history is available yet.
                </div>
              )}
            </div>

            <div className="mt-6 rounded-[24px] bg-[var(--brand-soft)] px-5 py-5 text-sm text-[var(--foreground)]">
              {activeGateway
                ? `Online payments are available via ${activeGateway.provider} for ${(activeGateway.supported_channels ?? []).join(", ")}${activeGateway.checkout_url ? "." : ", but no hosted checkout URL is configured yet."}`
                : "Payment collection can be wired to your live gateway from the gateways module. The portal already exposes invoice and payment visibility to customers."}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
