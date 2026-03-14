import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

export type MembershipContext = {
  userId: string;
  userEmail: string;
  userName: string | null;
  companyId: string;
  companyName: string;
  companySlug: string;
  role: string;
};

export const getMembershipContext = cache(async (): Promise<MembershipContext | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: membership, error } = await supabase
    .from("company_members")
    .select(
      `
        role,
        company:companies (
          id,
          name,
          slug
        )
      `,
    )
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (error || !membership?.company) {
    return null;
  }

  const company = Array.isArray(membership.company)
    ? membership.company[0]
    : membership.company;

  if (!company) {
    return null;
  }

  return {
    userId: user.id,
    userEmail: user.email ?? "",
    userName: (user.user_metadata.full_name as string | undefined) ?? null,
    companyId: company.id,
    companyName: company.name,
    companySlug: company.slug,
    role: membership.role,
  };
});
