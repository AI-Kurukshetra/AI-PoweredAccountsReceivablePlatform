"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getMembershipContext } from "@/lib/company";
import { createClient } from "@/lib/supabase/server";

export type TemplateActionState = {
  error?: string;
};

const templateSchema = z.object({
  name: z.string().trim().min(2, "Template name is required."),
  description: z.preprocess(
    (value) => (value === "" || value === null ? undefined : value),
    z.string().trim().optional(),
  ),
  deliveryChannel: z.preprocess(
    (value) => (value === "" || value === null ? undefined : value),
    z.string().trim().optional(),
  ),
  paymentTermsDays: z.coerce
    .number()
    .int()
    .min(0, "Payment terms cannot be negative.")
    .max(365, "Payment terms are too large."),
  accentColor: z
    .string()
    .trim()
    .regex(/^#[0-9a-fA-F]{6}$/, "Use a full hex color such as #3d73e7."),
  footerText: z.preprocess(
    (value) => (value === "" || value === null ? undefined : value),
    z.string().trim().optional(),
  ),
  isDefault: z.preprocess(
    (value) => (value === null ? undefined : value),
    z.union([z.literal("on"), z.literal("true"), z.literal("")]).optional(),
  ),
});

export async function createTemplateAction(
  _prevState: TemplateActionState,
  formData: FormData,
) {
  const membership = await getMembershipContext();

  if (!membership) {
    return { error: "Company membership not found." };
  }

  const parsed = templateSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description"),
    deliveryChannel: formData.get("deliveryChannel"),
    paymentTermsDays: formData.get("paymentTermsDays"),
    accentColor: formData.get("accentColor"),
    footerText: formData.get("footerText"),
    isDefault: formData.get("isDefault"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid template." };
  }

  const supabase = await createClient();
  const isDefault = parsed.data.isDefault === "on";

  if (isDefault) {
    const { error: resetError } = await supabase
      .from("invoice_templates")
      .update({ is_default: false })
      .eq("company_id", membership.companyId);

    if (resetError) {
      return { error: resetError.message };
    }
  }

  const { error } = await supabase.from("invoice_templates").insert({
    company_id: membership.companyId,
    name: parsed.data.name,
    description: parsed.data.description ?? null,
    delivery_channel: parsed.data.deliveryChannel ?? null,
    payment_terms_days: parsed.data.paymentTermsDays,
    accent_color: parsed.data.accentColor,
    footer_text: parsed.data.footerText ?? null,
    is_default: isDefault,
    created_by: membership.userId,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/templates");
  revalidatePath("/invoices/new");
  redirect("/templates");
}
