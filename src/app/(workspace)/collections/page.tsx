import { EmptyState } from "@/components/ui/empty-state";
import { SectionCard } from "@/components/ui/section-card";
import { StatusPill } from "@/components/ui/status-pill";
import {
  createReminderPolicyAction,
  runReminderAutomationAction,
} from "@/app/(workspace)/collections/actions";
import { getMembershipContext } from "@/lib/company";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceSnapshot } from "@/lib/workspace-data";

export default async function CollectionsPage() {
  const membership = await getMembershipContext();
  const snapshot = await getWorkspaceSnapshot();

  if (!snapshot || !membership) {
    return null;
  }

  const supabase = await createClient();
  const { data: policiesData } = await supabase
    .from("reminder_policies")
    .select("id, name, trigger_type, days_offset, stage, channel, is_active, created_at")
    .eq("company_id", membership.companyId)
    .order("created_at", { ascending: false });

  const policies = (policiesData ?? []) as {
    id: string;
    name: string;
    trigger_type: "before_due" | "after_due";
    days_offset: number;
    stage: string;
    channel: string;
    is_active: boolean;
    created_at: string;
  }[];

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

      <div className="grid gap-5 xl:grid-cols-[1.12fr_0.88fr]">
        <SectionCard eyebrow="Automation" title="Automated reminder policies">
          <div className="mb-4 flex items-center justify-between gap-3">
            <p className="text-sm text-[var(--ink-soft)]">
              Apply reminder sequences based on due-date offsets and aging state.
            </p>
            <form action={runReminderAutomationAction}>
              <button type="submit" className="secondary-button">
                Run reminder automation
              </button>
            </form>
          </div>
          {policies.length ? (
            <div className="space-y-3">
              {policies.map((policy) => (
                <article key={policy.id} className="rounded-[20px] border border-[var(--stroke)] bg-white p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.18em] text-[var(--stroke-strong)]">
                        {policy.trigger_type.replaceAll("_", " ")}
                      </p>
                      <h3 className="mt-2 text-lg font-semibold text-[var(--foreground)]">
                        {policy.name}
                      </h3>
                      <p className="mt-1 text-sm text-[var(--ink-soft)]">
                        {policy.stage} · {policy.channel} · {policy.days_offset} day(s)
                      </p>
                    </div>
                    <StatusPill label={policy.is_active ? "Healthy" : "Draft"} />
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <EmptyState
              title="No reminder policies"
              copy="Create policy rules to automate pre-due and overdue follow-up reminders."
            />
          )}
        </SectionCard>

        <SectionCard eyebrow="Create" title="Add reminder policy">
          <form action={createReminderPolicyAction} className="space-y-4">
            <div>
              <label className="text-sm text-[var(--stroke-strong)]">Policy name</label>
              <input name="name" required minLength={2} className="form-input mt-1" />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="text-sm text-[var(--stroke-strong)]">Trigger</label>
                <select name="triggerType" className="form-select mt-1" defaultValue="before_due">
                  <option value="before_due">Before due</option>
                  <option value="after_due">After due</option>
                </select>
              </div>
              <div>
                <label className="text-sm text-[var(--stroke-strong)]">Days offset</label>
                <input
                  name="daysOffset"
                  type="number"
                  min={0}
                  max={120}
                  defaultValue={3}
                  className="form-input mt-1"
                />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="text-sm text-[var(--stroke-strong)]">Channel</label>
                <select name="channel" className="form-select mt-1" defaultValue="email">
                  <option value="email">Email</option>
                  <option value="sms">SMS</option>
                  <option value="call_task">Call task</option>
                </select>
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-2 text-sm text-[var(--foreground)]">
                  <input type="checkbox" name="isActive" defaultChecked />
                  Active policy
                </label>
              </div>
            </div>
            <div>
              <label className="text-sm text-[var(--stroke-strong)]">Stage label</label>
              <input
                name="stage"
                required
                minLength={2}
                defaultValue="3 days before due date"
                className="form-input mt-1"
              />
            </div>
            <button type="submit" className="primary-button w-full">
              Create reminder policy
            </button>
          </form>
        </SectionCard>
      </div>
    </div>
  );
}
