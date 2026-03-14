"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getMembershipContext } from "@/lib/company";
import { createAdminClient } from "@/lib/supabase/admin";

const roles = ["owner", "admin", "finance_manager", "collector", "viewer"] as const;
const assignableRoles = ["admin", "finance_manager", "collector", "viewer"] as const;

export type AccessInviteState = {
  error?: string;
  success?: string;
};

const accessSchema = z.object({
  memberId: z.string().uuid("Invalid member."),
  role: z.enum(roles),
});

const memberCreateSchema = z.object({
  fullName: z.string().trim().min(2, "Full name is required."),
  email: z.email().trim().toLowerCase(),
  role: z.enum(assignableRoles),
});

export async function updateMemberRoleAction(formData: FormData) {
  const membership = await getMembershipContext();

  if (!membership || !["owner", "admin"].includes(membership.role)) {
    return;
  }

  const parsed = accessSchema.safeParse({
    memberId: formData.get("memberId"),
    role: formData.get("role"),
  });

  if (!parsed.success) {
    return;
  }

  const admin = createAdminClient();
  const { data: target } = await admin
    .from("company_members")
    .select("id, role, user_id")
    .eq("company_id", membership.companyId)
    .eq("id", parsed.data.memberId)
    .maybeSingle();

  if (!target) {
    return;
  }

  if (target.role === "owner") {
    return;
  }

  if (target.user_id === membership.userId && membership.role !== "owner") {
    return;
  }

  await admin
    .from("company_members")
    .update({ role: parsed.data.role })
    .eq("company_id", membership.companyId)
    .eq("id", parsed.data.memberId);

  revalidatePath("/access");
}

function getInviteOrigin(originHeader: string | null) {
  return originHeader ?? process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}

function formatRoleLabel(role: (typeof roles)[number]) {
  return role.replaceAll("_", " ");
}

export async function createMemberAction(
  _prevState: AccessInviteState,
  formData: FormData,
) {
  const membership = await getMembershipContext();

  if (!membership || !["owner", "admin"].includes(membership.role)) {
    return { error: "Only owners and admins can add company members." };
  }

  const parsed = memberCreateSchema.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    role: formData.get("role"),
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Invalid member information.",
    };
  }

  const admin = createAdminClient();
  const normalizedEmail = parsed.data.email.toLowerCase();
  const roleLabel = formatRoleLabel(parsed.data.role);

  const { data: existingProfile } = await admin
    .from("profiles")
    .select("id, email")
    .eq("email", normalizedEmail)
    .maybeSingle();

  if (existingProfile) {
    const { data: existingMembership } = await admin
      .from("company_members")
      .select("id, company_id")
      .eq("user_id", existingProfile.id)
      .limit(1)
      .maybeSingle();

    if (existingMembership?.company_id === membership.companyId) {
      return { error: "This user already belongs to the company." };
    }

    if (existingMembership?.company_id) {
      return {
        error:
          "This user already belongs to another company workspace and cannot be assigned here yet.",
      };
    }

    const { error: memberError } = await admin.from("company_members").insert({
      company_id: membership.companyId,
      user_id: existingProfile.id,
      role: parsed.data.role,
    });

    if (memberError) {
      return { error: memberError.message };
    }

    revalidatePath("/access");

    return {
      success: `Added ${normalizedEmail} as ${roleLabel}.`,
    };
  }

  const headerStore = await headers();
  const origin = getInviteOrigin(headerStore.get("origin"));
  const { data: inviteData, error: inviteError } = await admin.auth.admin.inviteUserByEmail(
    normalizedEmail,
    {
      data: parsed.data.fullName ? { full_name: parsed.data.fullName } : undefined,
      redirectTo: `${origin}/auth/confirm?next=/dashboard`,
    },
  );

  const invitedUser = inviteData.user;

  if (inviteError || !invitedUser) {
    return { error: inviteError?.message ?? "Could not invite member." };
  }

  const { data: existingMembership } = await admin
    .from("company_members")
    .select("id, company_id")
    .eq("user_id", invitedUser.id)
    .limit(1)
    .maybeSingle();

  if (existingMembership?.company_id === membership.companyId) {
    return { error: "This user already belongs to the company." };
  }

  if (existingMembership?.company_id) {
    return {
      error:
        "This user already belongs to another company workspace and cannot be assigned here yet.",
    };
  }

  const { error: memberError } = await admin.from("company_members").insert({
    company_id: membership.companyId,
    user_id: invitedUser.id,
    role: parsed.data.role,
  });

  if (memberError) {
    return { error: memberError.message };
  }

  revalidatePath("/access");

  return {
    success: `Invited ${normalizedEmail} as ${roleLabel}. They can join after accepting the email invite.`,
  };
}
