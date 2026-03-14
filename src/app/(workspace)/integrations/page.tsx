import { EmptyState } from "@/components/ui/empty-state";
import { SectionCard } from "@/components/ui/section-card";
import { StatusPill } from "@/components/ui/status-pill";
import { IntegrationForm } from "@/components/workspace/integration-form";
import { createIntegrationAction } from "@/app/(workspace)/integrations/actions";
import { getMembershipContext } from "@/lib/company";
import { createClient } from "@/lib/supabase/server";

type IntegrationRow = {
  id: string;
  name: string;
  provider: string;
  category: string;
  status: string;
  health_note: string | null;
  webhook_url: string | null;
  last_sync_at: string | null;
  config: { scope?: string } | null;
};

export default async function IntegrationsPage() {
  const membership = await getMembershipContext();

  if (!membership) {
    return null;
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("integration_connections")
    .select("id, name, provider, category, status, health_note, webhook_url, last_sync_at, config")
    .eq("company_id", membership.companyId)
    .order("last_sync_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });

  const integrations = (data ?? []) as IntegrationRow[];

  return (
    <div className="space-y-5">
      <section className="card-surface rounded-[28px] p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-xs uppercase tracking-[0.24em] text-[var(--stroke-strong)]">
              Integrations
            </p>
            <h2 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-[var(--foreground)]">
              Track ERP, payments, communications, and webhook connections from one operational page.
            </h2>
            <p className="mt-3 text-sm leading-6 text-[var(--ink-soft)]">
              This covers the missing accounting integration module and gives the webhook/API surface an actual home in the product.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="soft-panel rounded-xl px-4 py-3 text-sm">
              <p className="text-[var(--stroke-strong)]">Connections</p>
              <p className="mt-1 font-semibold text-[var(--foreground)]">
                {integrations.length}
              </p>
            </div>
            <div className="soft-panel rounded-xl px-4 py-3 text-sm">
              <p className="text-[var(--stroke-strong)]">Healthy</p>
              <p className="mt-1 font-semibold text-[var(--foreground)]">
                {integrations.filter((connection) => connection.status === "healthy").length}
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[1.14fr_0.86fr]">
        <SectionCard eyebrow="Connections" title="Operational integration status">
          {integrations.length ? (
            <div className="space-y-3">
              {integrations.map((connection) => (
                <article
                  key={connection.id}
                  className="rounded-[22px] border border-[var(--stroke)] bg-white p-5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.18em] text-[var(--stroke-strong)]">
                        {connection.category}
                      </p>
                      <h3 className="mt-2 text-lg font-semibold text-[var(--foreground)]">
                        {connection.name}
                      </h3>
                      <p className="mt-1 text-sm text-[var(--ink-soft)]">
                        {connection.provider}
                      </p>
                    </div>
                    <StatusPill label={connection.status} />
                  </div>
                  <div className="mt-4 grid gap-3 md:grid-cols-3">
                    <div>
                      <p className="text-sm text-[var(--stroke-strong)]">Scope</p>
                      <p className="mt-1 text-sm text-[var(--foreground)]">
                        {connection.config?.scope ?? "Not specified"}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-[var(--stroke-strong)]">Webhook</p>
                      <p className="mt-1 break-all text-sm text-[var(--foreground)]">
                        {connection.webhook_url ?? "Not configured"}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-[var(--stroke-strong)]">Last sync</p>
                      <p className="mt-1 text-sm text-[var(--foreground)]">
                        {connection.last_sync_at
                          ? new Date(connection.last_sync_at).toLocaleString("en-US", {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "No sync yet"}
                      </p>
                    </div>
                  </div>
                  <p className="mt-4 text-sm text-[var(--ink-soft)]">
                    {connection.health_note ?? "No health notes captured yet."}
                  </p>
                </article>
              ))}
            </div>
          ) : (
            <EmptyState
              title="No integrations tracked"
              copy="Create connections for ERP, payment, or webhook flows so the implementation plan is represented in the product."
            />
          )}
        </SectionCard>

        <SectionCard eyebrow="Create" title="Add connection">
          <IntegrationForm action={createIntegrationAction} />
        </SectionCard>
      </div>
    </div>
  );
}
