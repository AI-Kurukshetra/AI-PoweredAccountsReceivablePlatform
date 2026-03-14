import { EmptyState } from "@/components/ui/empty-state";
import { SectionCard } from "@/components/ui/section-card";
import { StatusPill } from "@/components/ui/status-pill";
import { DeliveryForm } from "@/components/workspace/delivery-form";
import { createDeliveryAction } from "@/app/(workspace)/deliveries/actions";
import { getMembershipContext } from "@/lib/company";
import { getWorkspaceSnapshot } from "@/lib/workspace-data";
import { createClient } from "@/lib/supabase/server";

type DeliveryRow = {
  id: string;
  channel: string;
  status: string;
  recipient: string | null;
  tracking_ref: string | null;
  scheduled_for: string;
  sent_at: string | null;
  delivered_at: string | null;
  failure_reason: string | null;
  invoice: { invoice_number: string } | { invoice_number: string }[] | null;
  customer: { name: string } | { name: string }[] | null;
};

function normalizeRelation<T>(value: T | T[] | null): T | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

export default async function DeliveriesPage() {
  const membership = await getMembershipContext();
  const snapshot = await getWorkspaceSnapshot();

  if (!membership || !snapshot) {
    return null;
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("invoice_deliveries")
    .select(
      `
        id,
        channel,
        status,
        recipient,
        tracking_ref,
        scheduled_for,
        sent_at,
        delivered_at,
        failure_reason,
        invoice:invoices(invoice_number),
        customer:customers(name)
      `,
    )
    .eq("company_id", membership.companyId)
    .order("scheduled_for", { ascending: false });

  const deliveries = ((data ?? []) as DeliveryRow[]).map((delivery) => ({
    ...delivery,
    invoice: normalizeRelation(delivery.invoice),
    customer: normalizeRelation(delivery.customer),
  }));

  return (
    <div className="space-y-5">
      <section className="card-surface rounded-[28px] p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-xs uppercase tracking-[0.24em] text-[var(--stroke-strong)]">
              Deliveries
            </p>
            <h2 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-[var(--foreground)]">
              Track invoice delivery across email, SMS, portal, and postal channels with confirmation state.
            </h2>
            <p className="mt-3 text-sm leading-6 text-[var(--ink-soft)]">
              This closes the multi-channel invoice delivery gap from the SRS and gives delivery confirmation a dedicated working queue.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="soft-panel rounded-xl px-4 py-3 text-sm">
              <p className="text-[var(--stroke-strong)]">Records</p>
              <p className="mt-1 font-semibold text-[var(--foreground)]">{deliveries.length}</p>
            </div>
            <div className="soft-panel rounded-xl px-4 py-3 text-sm">
              <p className="text-[var(--stroke-strong)]">Delivered</p>
              <p className="mt-1 font-semibold text-[var(--foreground)]">
                {deliveries.filter((delivery) => ["delivered", "confirmed"].includes(delivery.status)).length}
              </p>
            </div>
            <div className="soft-panel rounded-xl px-4 py-3 text-sm">
              <p className="text-[var(--stroke-strong)]">Failed</p>
              <p className="mt-1 font-semibold text-[var(--foreground)]">
                {deliveries.filter((delivery) => delivery.status === "failed").length}
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[1.14fr_0.86fr]">
        <SectionCard eyebrow="Queue" title="Invoice delivery activity">
          {deliveries.length ? (
            <div className="space-y-3">
              {deliveries.map((delivery) => (
                <article
                  key={delivery.id}
                  className="rounded-[22px] border border-[var(--stroke)] bg-white p-5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.18em] text-[var(--stroke-strong)]">
                        {delivery.channel}
                      </p>
                      <h3 className="mt-2 text-lg font-semibold text-[var(--foreground)]">
                        {delivery.invoice?.invoice_number ?? "Unknown invoice"}
                      </h3>
                      <p className="mt-1 text-sm text-[var(--ink-soft)]">
                        {delivery.customer?.name ?? "Unknown customer"} · {delivery.recipient ?? "No recipient"}
                      </p>
                    </div>
                    <StatusPill label={delivery.status} />
                  </div>
                  <div className="mt-4 grid gap-3 md:grid-cols-3 text-sm text-[var(--ink-soft)]">
                    <p>
                      Scheduled{" "}
                      {new Date(delivery.scheduled_for).toLocaleString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                    <p>Tracking {delivery.tracking_ref ?? "Not set"}</p>
                    <p>
                      Delivered{" "}
                      {delivery.delivered_at
                        ? new Date(delivery.delivered_at).toLocaleString("en-US", {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "Pending"}
                    </p>
                  </div>
                  {delivery.failure_reason ? (
                    <p className="mt-4 text-sm text-[var(--danger)]">
                      Failure reason: {delivery.failure_reason}
                    </p>
                  ) : null}
                </article>
              ))}
            </div>
          ) : (
            <EmptyState
              title="No deliveries tracked"
              copy="Create invoice delivery records to monitor email, SMS, portal, and postal confirmation state."
            />
          )}
        </SectionCard>

        <SectionCard eyebrow="Create" title="Add delivery record">
          <DeliveryForm
            invoices={snapshot.invoices.map((invoice) => ({
              id: invoice.id,
              label: `${invoice.invoice_number} · ${invoice.customer?.name ?? "Unknown"}`,
            }))}
            action={createDeliveryAction}
          />
        </SectionCard>
      </div>
    </div>
  );
}
