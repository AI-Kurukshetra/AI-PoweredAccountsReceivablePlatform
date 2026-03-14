"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getMembershipContext } from "@/lib/company";
import { createClient } from "@/lib/supabase/server";

export type ComplianceActionState = {
  error?: string;
};

const complianceSchema = z.object({
  category: z.string().trim().min(2, "Category is required."),
  controlName: z.string().trim().min(3, "Control name is required."),
  framework: z.enum(["SOC 2", "PCI DSS", "Internal"]),
  status: z.enum(["planned", "implemented", "monitoring", "gap"]),
  owner: z.preprocess(
    (value) => (value === "" || value === null ? undefined : value),
    z.string().trim().optional(),
  ),
  lastReviewedAt: z.preprocess(
    (value) => (value === "" || value === null ? undefined : value),
    z.string().optional(),
  ),
  nextReviewDue: z.preprocess(
    (value) => (value === "" || value === null ? undefined : value),
    z.string().optional(),
  ),
  notes: z.preprocess(
    (value) => (value === "" || value === null ? undefined : value),
    z.string().trim().optional(),
  ),
});

export async function createSecurityControlAction(
  _prevState: ComplianceActionState,
  formData: FormData,
) {
  const membership = await getMembershipContext();

  if (!membership) {
    return { error: "Company membership not found." };
  }

  const parsed = complianceSchema.safeParse({
    category: formData.get("category"),
    controlName: formData.get("controlName"),
    framework: formData.get("framework"),
    status: formData.get("status"),
    owner: formData.get("owner"),
    lastReviewedAt: formData.get("lastReviewedAt"),
    nextReviewDue: formData.get("nextReviewDue"),
    notes: formData.get("notes"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid control." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("security_controls").insert({
    company_id: membership.companyId,
    category: parsed.data.category,
    control_name: parsed.data.controlName,
    framework: parsed.data.framework,
    status: parsed.data.status,
    owner: parsed.data.owner ?? null,
    last_reviewed_at: parsed.data.lastReviewedAt
      ? new Date(parsed.data.lastReviewedAt).toISOString()
      : null,
    next_review_due: parsed.data.nextReviewDue
      ? new Date(parsed.data.nextReviewDue).toISOString()
      : null,
    notes: parsed.data.notes ?? null,
    created_by: membership.userId,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/compliance");
  redirect("/compliance");
}
