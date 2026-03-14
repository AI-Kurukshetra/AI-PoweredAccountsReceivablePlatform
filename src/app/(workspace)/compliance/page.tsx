import { EmptyState } from "@/components/ui/empty-state";
import { SectionCard } from "@/components/ui/section-card";
import { StatusPill } from "@/components/ui/status-pill";
import { SecurityControlForm } from "@/components/workspace/security-control-form";
import { createSecurityControlAction } from "@/app/(workspace)/compliance/actions";
import { getMembershipContext } from "@/lib/company";
import { createClient } from "@/lib/supabase/server";

type ControlRow = {
  id: string;
  category: string;
  control_name: string;
  framework: string;
  status: string;
  owner: string | null;
  last_reviewed_at: string | null;
  next_review_due: string | null;
  notes: string | null;
};

type AuditRow = {
  id: string;
};

export default async function CompliancePage() {
  const membership = await getMembershipContext();

  if (!membership) {
    return null;
  }

  const supabase = await createClient();
  const [{ data: controlsData }, { data: auditData }] = await Promise.all([
    supabase
      .from("security_controls")
      .select(
        "id, category, control_name, framework, status, owner, last_reviewed_at, next_review_due, notes",
      )
      .eq("company_id", membership.companyId)
      .order("updated_at", { ascending: false }),
    supabase
      .from("audit_logs")
      .select("id")
      .eq("company_id", membership.companyId)
      .limit(50),
  ]);

  const controls = (controlsData ?? []) as ControlRow[];
  const auditLogs = (auditData ?? []) as AuditRow[];

  return (
    <div className="space-y-5">
      <section className="card-surface rounded-[28px] p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-xs uppercase tracking-[0.24em] text-[var(--stroke-strong)]">
              Compliance
            </p>
            <h2 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-[var(--foreground)]">
              Track security controls, framework coverage, and review cadence for AR operations.
            </h2>
            <p className="mt-3 text-sm leading-6 text-[var(--ink-soft)]">
              This is the missing compliance and security module for the SRS, built around concrete controls instead of generic claims.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="soft-panel rounded-xl px-4 py-3 text-sm">
              <p className="text-[var(--stroke-strong)]">Controls</p>
              <p className="mt-1 font-semibold text-[var(--foreground)]">{controls.length}</p>
            </div>
            <div className="soft-panel rounded-xl px-4 py-3 text-sm">
              <p className="text-[var(--stroke-strong)]">Implemented</p>
              <p className="mt-1 font-semibold text-[var(--foreground)]">
                {controls.filter((control) => control.status === "implemented").length}
              </p>
            </div>
            <div className="soft-panel rounded-xl px-4 py-3 text-sm">
              <p className="text-[var(--stroke-strong)]">Recent audit rows</p>
              <p className="mt-1 font-semibold text-[var(--foreground)]">{auditLogs.length}</p>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[1.12fr_0.88fr]">
        <SectionCard eyebrow="Controls" title="Compliance and security posture">
          {controls.length ? (
            <div className="space-y-3">
              {controls.map((control) => (
                <article
                  key={control.id}
                  className="rounded-[22px] border border-[var(--stroke)] bg-white p-5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.18em] text-[var(--stroke-strong)]">
                        {control.framework} · {control.category}
                      </p>
                      <h3 className="mt-2 text-lg font-semibold text-[var(--foreground)]">
                        {control.control_name}
                      </h3>
                      <p className="mt-1 text-sm text-[var(--ink-soft)]">
                        Owner: {control.owner ?? "Unassigned"}
                      </p>
                    </div>
                    <StatusPill label={control.status} />
                  </div>
                  <div className="mt-4 grid gap-3 md:grid-cols-2 text-sm text-[var(--ink-soft)]">
                    <p>
                      Last reviewed{" "}
                      {control.last_reviewed_at
                        ? new Date(control.last_reviewed_at).toLocaleDateString("en-US")
                        : "Not recorded"}
                    </p>
                    <p>
                      Next review{" "}
                      {control.next_review_due
                        ? new Date(control.next_review_due).toLocaleDateString("en-US")
                        : "Not scheduled"}
                    </p>
                  </div>
                  {control.notes ? (
                    <p className="mt-4 text-sm text-[var(--ink-soft)]">{control.notes}</p>
                  ) : null}
                </article>
              ))}
            </div>
          ) : (
            <EmptyState
              title="No controls registered"
              copy="Add security and compliance controls so framework coverage and review dates are visible in the workspace."
            />
          )}
        </SectionCard>

        <SectionCard eyebrow="Create" title="Add security control">
          <SecurityControlForm action={createSecurityControlAction} />
        </SectionCard>
      </div>
    </div>
  );
}
