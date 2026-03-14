"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getMembershipContext } from "@/lib/company";
import { createClient } from "@/lib/supabase/server";

export type IntegrationActionState = {
  error?: string;
};

const integrationSchema = z.object({
  name: z.string().trim().min(2, "Connection name is required."),
  provider: z.string().trim().min(2, "Provider is required."),
  category: z.enum(["erp", "payments", "communications", "webhook"]),
  status: z.enum(["planned", "healthy", "review", "lagging"]),
  healthNote: z.preprocess(
    (value) => (value === "" || value === null ? undefined : value),
    z.string().trim().optional(),
  ),
  webhookUrl: z.preprocess(
    (value) => (value === "" || value === null ? undefined : value),
    z.url().optional(),
  ),
  lastSyncAt: z.preprocess(
    (value) => (value === "" || value === null ? undefined : value),
    z.string().optional(),
  ),
  scope: z.preprocess(
    (value) => (value === "" || value === null ? undefined : value),
    z.string().trim().optional(),
  ),
});

export async function createIntegrationAction(
  _prevState: IntegrationActionState,
  formData: FormData,
) {
  const membership = await getMembershipContext();

  if (!membership) {
    return { error: "Company membership not found." };
  }

  const parsed = integrationSchema.safeParse({
    name: formData.get("name"),
    provider: formData.get("provider"),
    category: formData.get("category"),
    status: formData.get("status"),
    healthNote: formData.get("healthNote"),
    webhookUrl: formData.get("webhookUrl"),
    lastSyncAt: formData.get("lastSyncAt"),
    scope: formData.get("scope"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid integration." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("integration_connections").insert({
    company_id: membership.companyId,
    name: parsed.data.name,
    provider: parsed.data.provider,
    category: parsed.data.category,
    status: parsed.data.status,
    health_note: parsed.data.healthNote ?? null,
    webhook_url: parsed.data.webhookUrl ?? null,
    last_sync_at: parsed.data.lastSyncAt
      ? new Date(parsed.data.lastSyncAt).toISOString()
      : null,
    config: parsed.data.scope ? { scope: parsed.data.scope } : {},
    created_by: membership.userId,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/integrations");
  redirect("/integrations");
}
