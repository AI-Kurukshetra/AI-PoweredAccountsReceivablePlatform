import { EmptyState } from "@/components/ui/empty-state";
import { SectionCard } from "@/components/ui/section-card";
import { StatusPill } from "@/components/ui/status-pill";
import {
  createMemberAction,
  updateMemberRoleAction,
} from "@/app/(workspace)/access/actions";
import { MemberInviteForm } from "@/components/workspace/member-invite-form";
import { getMembershipContext } from "@/lib/company";
import { createAdminClient } from "@/lib/supabase/admin";

type MemberRow = {
  id: string;
  user_id: string;
  role: string;
  created_at: string;
};

type ProfileRow = {
  id: string;
  full_name: string;
  email: string;
};

const roles = ["owner", "admin", "finance_manager", "collector", "viewer"] as const;

export default async function AccessPage() {
  const membership = await getMembershipContext();

  if (!membership) {
    return null;
  }

  const admin = createAdminClient();
  const { data: membersData } = await admin
    .from("company_members")
    .select("id, user_id, role, created_at")
    .eq("company_id", membership.companyId)
    .order("created_at");

  const members = (membersData ?? []) as MemberRow[];
  const profileIds = members.map((member) => member.user_id);
  const { data: profilesData } = profileIds.length
    ? await admin
        .from("profiles")
        .select("id, full_name, email")
        .in("id", profileIds)
    : { data: [] as ProfileRow[] };

  const profiles = new Map((profilesData ?? []).map((profile) => [profile.id, profile]));
  const canManage = ["owner", "admin"].includes(membership.role);

  return (
    <div className="space-y-5">
      <section className="card-surface rounded-[28px] p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-xs uppercase tracking-[0.24em] text-[var(--stroke-strong)]">
              Add company members
            </p>
            <h2 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-[var(--foreground)]">
              Add company members and keep ownership, finance, and collection permissions explicit.
            </h2>
            <p className="mt-3 text-sm leading-6 text-[var(--ink-soft)]">
              This gives the current build a real role-based access control module instead of leaving roles buried in the database only.
            </p>
          </div>
          <div className="soft-panel rounded-xl px-4 py-3 text-sm">
            <p className="text-[var(--stroke-strong)]">Members</p>
            <p className="mt-1 font-semibold text-[var(--foreground)]">{members.length}</p>
          </div>
        </div>
      </section>

      <SectionCard eyebrow="Membership" title="Company roles">
        {canManage ? (
          <div className="mb-5 rounded-[24px] border border-[var(--stroke)] bg-[var(--surface-muted)]/60 p-5">
            <p className="text-sm font-semibold text-[var(--foreground)]">Add company member</p>
            <p className="mt-2 text-sm leading-6 text-[var(--ink-soft)]">
              Add an existing user by email or invite a new teammate and assign their role before
              they first sign in.
            </p>
            <div className="mt-4">
              <MemberInviteForm action={createMemberAction} />
            </div>
          </div>
        ) : null}

        {!canManage ? (
          <div className="mb-5 rounded-[20px] border border-[var(--stroke)] bg-white px-4 py-4 text-sm text-[var(--ink-soft)]">
            Your role is currently read-only for membership changes. Owners and admins can update other member roles here.
          </div>
        ) : null}

        {members.length ? (
          <div className="space-y-3">
            {members.map((member) => {
              const profile = profiles.get(member.user_id);
              const isOwner = member.role === "owner";
              const disableEdit = !canManage || isOwner;

              return (
                <article
                  key={member.id}
                  className="rounded-[22px] border border-[var(--stroke)] bg-white p-5"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-[0.18em] text-[var(--stroke-strong)]">
                        Member since{" "}
                        {new Date(member.created_at).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </p>
                      <h3 className="mt-2 text-lg font-semibold text-[var(--foreground)]">
                        {profile?.full_name ?? member.user_id}
                      </h3>
                      <p className="mt-1 text-sm text-[var(--ink-soft)]">
                        {profile?.email ?? "No email found"}
                      </p>
                    </div>

                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                      <StatusPill label={member.role} />
                      <form action={updateMemberRoleAction} className="flex flex-wrap items-center gap-3">
                        <input type="hidden" name="memberId" value={member.id} />
                        <select
                          name="role"
                          defaultValue={member.role}
                          disabled={disableEdit}
                          className="form-select min-w-[220px]"
                        >
                          {roles.map((role) => (
                            <option key={role} value={role}>
                              {role.replaceAll("_", " ")}
                            </option>
                          ))}
                        </select>
                        <button
                          type="submit"
                          disabled={disableEdit}
                          className="secondary-button disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Save role
                        </button>
                      </form>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <EmptyState
            title="No company members"
            copy="Membership records will appear here once users are assigned to the company."
          />
        )}
      </SectionCard>
    </div>
  );
}
