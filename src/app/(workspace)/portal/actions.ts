"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getMembershipContext } from "@/lib/company";
import { buildPortalToken } from "@/lib/portal";
import { createClient } from "@/lib/supabase/server";

const portalSchema = z.object({
  customerId: z.string().uuid("Invalid customer."),
  intent: z.enum(["enable", "disable", "rotate"]),
});

export async function updatePortalAccessAction(formData: FormData) {
  const membership = await getMembershipContext();

  if (!membership) {
    return;
  }

  const parsed = portalSchema.safeParse({
    customerId: formData.get("customerId"),
    intent: formData.get("intent"),
  });

  if (!parsed.success) {
    return;
  }

  const supabase = await createClient();
  const { data: current } = await supabase
    .from("customers")
    .select("portal_access_token")
    .eq("company_id", membership.companyId)
    .eq("id", parsed.data.customerId)
    .maybeSingle();

  const nextToken =
    parsed.data.intent === "rotate" || !current?.portal_access_token
      ? buildPortalToken()
      : current.portal_access_token;

  const updates =
    parsed.data.intent === "disable"
      ? { portal_enabled: false }
      : { portal_enabled: true, portal_access_token: nextToken };

  await supabase
    .from("customers")
    .update(updates)
    .eq("company_id", membership.companyId)
    .eq("id", parsed.data.customerId);

  revalidatePath("/portal");
  if (nextToken) {
    revalidatePath(`/portal/${nextToken}`);
  }
}
