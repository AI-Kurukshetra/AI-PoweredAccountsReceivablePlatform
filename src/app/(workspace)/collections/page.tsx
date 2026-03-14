import { EmptyState } from "@/components/ui/empty-state";
import { SectionCard } from "@/components/ui/section-card";
import { StatusPill } from "@/components/ui/status-pill";
import { getWorkspaceSnapshot } from "@/lib/workspace-data";

export default async function CollectionsPage() {
  const snapshot = await getWorkspaceSnapshot();

  if (!snapshot) {
    return null;
  }

  return (
    <div className="space-y-5">
      <section className="card-surface rounded-[28px] p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-xs uppercase tracking-[0.24em] text-[var(--stroke-strong)]">
              Collections
            </p>
            <h2 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-[var(--foreground)]">
              Reminder cadence and disputes are organized into simple working queues.
            </h2>
            <p className="mt-3 text-sm leading-6 text-[var(--ink-soft)]">
              The focus here is follow-up workload and blocked invoices, not decorative panels.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="soft-panel rounded-xl px-4 py-3 text-sm">
              <p className="text-[var(--stroke-strong)]">Reminder records</p>
              <p className="mt-1 font-semibold text-[var(--foreground)]">
                {snapshot.reminders.length}
              </p>
            </div>
            <div className="soft-panel rounded-xl px-4 py-3 text-sm">
              <p className="text-[var(--stroke-strong)]">Disputes open</p>
              <p className="mt-1 font-semibold text-[var(--foreground)]">
                {snapshot.disputes.length}
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-2">
        <SectionCard eyebrow="Reminder cadences" title="Sequenced follow-ups">
          {snapshot.reminders.length ? (
            <div className="space-y-3">
              {snapshot.reminders.map((flow) => (
                <div key={flow.id} className="rounded-[20px] border border-[var(--stroke)] bg-white px-4 py-4">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-lg font-semibold text-[var(--foreground)]">
                      {flow.customer?.name ?? "Unknown customer"}
                    </h3>
                    <StatusPill label={flow.status} />
                  </div>
                  <div className="mt-3 grid gap-1.5 text-sm text-[var(--ink-soft)]">
                    <p>Stage: {flow.stage}</p>
                    <p>Invoice: {flow.invoice?.invoice_number ?? "No invoice linked"}</p>
                    <p>
                      Scheduled:{" "}
                      {new Date(flow.scheduled_for).toLocaleString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                    <p>Preferred channel: {flow.channel}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title="No reminder workflows"
              copy="Collection stages will appear here once reminders are scheduled for invoices."
            />
          )}
        </SectionCard>

        <SectionCard eyebrow="Disputes" title="Invoices blocked from normal collections">
          {snapshot.disputes.length ? (
            <div className="space-y-3">
              {snapshot.disputes.map((dispute) => (
                <div
                  key={dispute.id}
                  className="rounded-[20px] border border-[var(--stroke)] bg-white px-4 py-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.18em] text-[var(--stroke-strong)]">
                        {dispute.invoice?.invoice_number ?? "Dispute"}
                      </p>
                      <h3 className="mt-2 text-lg font-semibold text-[var(--foreground)]">
                        {dispute.customer?.name ?? "Unknown customer"}
                      </h3>
                    </div>
                    <StatusPill label="Disputed" />
                  </div>
                  <p className="mt-4 text-sm leading-6 text-[var(--foreground)]">
                    {dispute.title}
                  </p>
                  <p className="mt-2 text-sm text-[var(--ink-soft)]">
                    {dispute.description ?? "No description provided."}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title="No disputes recorded"
              copy="Invoice disputes and collection holds will appear here once customers challenge invoices."
            />
          )}
        </SectionCard>
      </div>
    </div>
  );
}
