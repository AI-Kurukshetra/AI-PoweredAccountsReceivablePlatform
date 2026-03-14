import { EmptyState } from "@/components/ui/empty-state";
import { SectionCard } from "@/components/ui/section-card";
import { StatusPill } from "@/components/ui/status-pill";
import { GatewayForm } from "@/components/workspace/gateway-form";
import { createGatewayAction } from "@/app/(workspace)/gateways/actions";
import { getMembershipContext } from "@/lib/company";
import { createClient } from "@/lib/supabase/server";

type GatewayRow = {
  id: string;
  account_label: string;
  provider: string;
  status: string;
  supported_channels: string[] | null;
  checkout_url: string | null;
  webhook_status: string;
  settlement_days: number;
  merchant_ref: string | null;
  last_event_at: string | null;
};

export default async function GatewaysPage() {
  const membership = await getMembershipContext();

  if (!membership) {
    return null;
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("payment_gateway_accounts")
    .select(
      "id, account_label, provider, status, supported_channels, checkout_url, webhook_status, settlement_days, merchant_ref, last_event_at",
    )
    .eq("company_id", membership.companyId)
    .order("updated_at", { ascending: false });

  const gateways = (data ?? []) as GatewayRow[];
  const liveGateways = gateways.filter((gateway) => gateway.status === "live");

  return (
    <div className="space-y-5">
      <section className="card-surface rounded-[28px] p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-xs uppercase tracking-[0.24em] text-[var(--stroke-strong)]">
              Gateways
            </p>
            <h2 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-[var(--foreground)]">
              Manage payment gateway accounts for card, ACH, wire, and wallet collection.
            </h2>
            <p className="mt-3 text-sm leading-6 text-[var(--ink-soft)]">
              This is the explicit must-have payment gateway module. It tracks provider state, checkout readiness, and webhook health instead of burying those concerns under generic integrations only.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="soft-panel rounded-xl px-4 py-3 text-sm">
              <p className="text-[var(--stroke-strong)]">Gateways</p>
              <p className="mt-1 font-semibold text-[var(--foreground)]">{gateways.length}</p>
            </div>
            <div className="soft-panel rounded-xl px-4 py-3 text-sm">
              <p className="text-[var(--stroke-strong)]">Live</p>
              <p className="mt-1 font-semibold text-[var(--foreground)]">{liveGateways.length}</p>
            </div>
            <div className="soft-panel rounded-xl px-4 py-3 text-sm">
              <p className="text-[var(--stroke-strong)]">Online checkout</p>
              <p className="mt-1 font-semibold text-[var(--foreground)]">
                {gateways.filter((gateway) => Boolean(gateway.checkout_url)).length}
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[1.14fr_0.86fr]">
        <SectionCard eyebrow="Accounts" title="Gateway configuration">
          {gateways.length ? (
            <div className="space-y-3">
              {gateways.map((gateway) => (
                <article
                  key={gateway.id}
                  className="rounded-[22px] border border-[var(--stroke)] bg-white p-5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.18em] text-[var(--stroke-strong)]">
                        {gateway.provider}
                      </p>
                      <h3 className="mt-2 text-lg font-semibold text-[var(--foreground)]">
                        {gateway.account_label}
                      </h3>
                      <p className="mt-1 text-sm text-[var(--ink-soft)]">
                        Merchant ref: {gateway.merchant_ref ?? "Not set"}
                      </p>
                    </div>
                    <StatusPill label={gateway.status} />
                  </div>
                  <div className="mt-4 grid gap-3 md:grid-cols-3 text-sm text-[var(--ink-soft)]">
                    <p>Channels {(gateway.supported_channels ?? []).join(", ") || "None"}</p>
                    <p>Settlement {gateway.settlement_days} days</p>
                    <p>Webhook {gateway.webhook_status.replaceAll("_", " ")}</p>
                  </div>
                  <div className="mt-4 rounded-[18px] border border-[var(--stroke)] bg-[var(--surface-muted)]/55 px-4 py-3 text-sm text-[var(--foreground)]">
                    {gateway.checkout_url ? gateway.checkout_url : "No hosted checkout URL configured"}
                  </div>
                  <p className="mt-3 text-xs text-[var(--ink-soft)]">
                    Last event:{" "}
                    {gateway.last_event_at
                      ? new Date(gateway.last_event_at).toLocaleString("en-US")
                      : "No events received"}
                  </p>
                </article>
              ))}
            </div>
          ) : (
            <EmptyState
              title="No gateway accounts"
              copy="Add live or sandbox gateway accounts so the portal and payment operations can point to real collection rails."
            />
          )}
        </SectionCard>

        <SectionCard eyebrow="Create" title="Add gateway account">
          <GatewayForm action={createGatewayAction} />
        </SectionCard>
      </div>
    </div>
  );
}
