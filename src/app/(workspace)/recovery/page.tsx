import { EmptyState } from "@/components/ui/empty-state";
import { SectionCard } from "@/components/ui/section-card";
import { StatusPill } from "@/components/ui/status-pill";
import { RecoveryForm } from "@/components/workspace/recovery-form";
import { createRecoverySnapshotAction } from "@/app/(workspace)/recovery/actions";
import { getMembershipContext } from "@/lib/company";
import { createClient } from "@/lib/supabase/server";

type SnapshotRow = {
  id: string;
  snapshot_name: string;
  scope: string;
  backup_kind: string;
  status: string;
  storage_ref: string;
  notes: string | null;
  expires_at: string | null;
  restore_tested_at: string | null;
  created_at: string;
};

export default async function RecoveryPage() {
  const membership = await getMembershipContext();

  if (!membership) {
    return null;
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("recovery_snapshots")
    .select(
      "id, snapshot_name, scope, backup_kind, status, storage_ref, notes, expires_at, restore_tested_at, created_at",
    )
    .eq("company_id", membership.companyId)
    .order("created_at", { ascending: false });

  const snapshots = (data ?? []) as SnapshotRow[];

  return (
    <div className="space-y-5">
      <section className="card-surface rounded-[28px] p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-xs uppercase tracking-[0.24em] text-[var(--stroke-strong)]">
              Recovery
            </p>
            <h2 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-[var(--foreground)]">
              Track backup snapshots, retention windows, and restore-test readiness.
            </h2>
            <p className="mt-3 text-sm leading-6 text-[var(--ink-soft)]">
              This adds a concrete backup and recovery module to the product instead of leaving resilience as undocumented infrastructure only.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="soft-panel rounded-xl px-4 py-3 text-sm">
              <p className="text-[var(--stroke-strong)]">Snapshots</p>
              <p className="mt-1 font-semibold text-[var(--foreground)]">{snapshots.length}</p>
            </div>
            <div className="soft-panel rounded-xl px-4 py-3 text-sm">
              <p className="text-[var(--stroke-strong)]">Verified</p>
              <p className="mt-1 font-semibold text-[var(--foreground)]">
                {snapshots.filter((snapshot) => snapshot.status === "verified").length}
              </p>
            </div>
            <div className="soft-panel rounded-xl px-4 py-3 text-sm">
              <p className="text-[var(--stroke-strong)]">Restore tested</p>
              <p className="mt-1 font-semibold text-[var(--foreground)]">
                {snapshots.filter((snapshot) => Boolean(snapshot.restore_tested_at)).length}
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[1.12fr_0.88fr]">
        <SectionCard eyebrow="Snapshots" title="Backup and restore history">
          {snapshots.length ? (
            <div className="space-y-3">
              {snapshots.map((snapshot) => (
                <article
                  key={snapshot.id}
                  className="rounded-[22px] border border-[var(--stroke)] bg-white p-5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.18em] text-[var(--stroke-strong)]">
                        {snapshot.backup_kind}
                      </p>
                      <h3 className="mt-2 text-lg font-semibold text-[var(--foreground)]">
                        {snapshot.snapshot_name}
                      </h3>
                      <p className="mt-1 text-sm text-[var(--ink-soft)]">{snapshot.scope}</p>
                    </div>
                    <StatusPill label={snapshot.status} />
                  </div>
                  <div className="mt-4 rounded-[18px] border border-[var(--stroke)] bg-[var(--surface-muted)]/55 px-4 py-3 text-sm text-[var(--foreground)]">
                    {snapshot.storage_ref}
                  </div>
                  <div className="mt-4 grid gap-3 md:grid-cols-2 text-sm text-[var(--ink-soft)]">
                    <p>
                      Expires{" "}
                      {snapshot.expires_at
                        ? new Date(snapshot.expires_at).toLocaleDateString("en-US")
                        : "No expiry"}
                    </p>
                    <p>
                      Restore tested{" "}
                      {snapshot.restore_tested_at
                        ? new Date(snapshot.restore_tested_at).toLocaleDateString("en-US")
                        : "Not yet"}
                    </p>
                  </div>
                  {snapshot.notes ? (
                    <p className="mt-4 text-sm text-[var(--ink-soft)]">{snapshot.notes}</p>
                  ) : null}
                </article>
              ))}
            </div>
          ) : (
            <EmptyState
              title="No recovery snapshots"
              copy="Register backup snapshots so retention windows and restore drills are visible to the team."
            />
          )}
        </SectionCard>

        <SectionCard eyebrow="Register" title="Add snapshot record">
          <RecoveryForm action={createRecoverySnapshotAction} />
        </SectionCard>
      </div>
    </div>
  );
}
