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

const integrationSyncSchema = z.object({
  integrationId: z.string().uuid("Invalid integration."),
  direction: z.enum(["pull", "push", "bi_directional"]),
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

export async function runIntegrationSyncAction(formData: FormData) {
  const membership = await getMembershipContext();

  if (!membership) {
    redirect("/login");
  }

  const parsed = integrationSyncSchema.safeParse({
    integrationId: formData.get("integrationId"),
    direction: formData.get("direction"),
  });

  if (!parsed.success) {
    redirect("/integrations");
  }

  const supabase = await createClient();
  const { data: integration } = await supabase
    .from("integration_connections")
    .select("id, name, provider")
    .eq("company_id", membership.companyId)
    .eq("id", parsed.data.integrationId)
    .maybeSingle();

  if (!integration) {
    redirect("/integrations");
  }

  const nowIso = new Date().toISOString();
  const { data: syncRun } = await supabase
    .from("integration_sync_runs")
    .insert({
      company_id: membership.companyId,
      integration_id: integration.id,
      direction: parsed.data.direction,
      status: "running",
      started_at: nowIso,
      triggered_by: membership.userId,
    })
    .select("id")
    .maybeSingle();

  const [{ count: invoiceCount }, { count: customerCount }, { count: paymentCount }] =
    await Promise.all([
      supabase
        .from("invoices")
        .select("id", { count: "exact", head: true })
        .eq("company_id", membership.companyId),
      supabase
        .from("customers")
        .select("id", { count: "exact", head: true })
        .eq("company_id", membership.companyId),
      supabase
        .from("payments")
        .select("id", { count: "exact", head: true })
        .eq("company_id", membership.companyId),
    ]);

  const summary = {
    invoices_processed: invoiceCount ?? 0,
    customers_processed: customerCount ?? 0,
    payments_processed: paymentCount ?? 0,
    direction: parsed.data.direction,
    result: "succeeded",
  };

  if (syncRun?.id) {
    await supabase
      .from("integration_sync_runs")
      .update({
        status: "succeeded",
        finished_at: new Date().toISOString(),
        summary,
      })
      .eq("company_id", membership.companyId)
      .eq("id", syncRun.id);
  }

  await supabase
    .from("integration_connections")
    .update({
      status: "healthy",
      last_sync_at: new Date().toISOString(),
      health_note: `Last sync succeeded for ${integration.provider}.`,
    })
    .eq("company_id", membership.companyId)
    .eq("id", integration.id);

  await supabase.from("audit_logs").insert({
    company_id: membership.companyId,
    actor_id: membership.userId,
    entity_type: "integration",
    entity_id: integration.id,
    action: "integration.sync",
    details: {
      integration_name: integration.name,
      provider: integration.provider,
      ...summary,
    },
  });

  revalidatePath("/integrations");
  revalidatePath("/dashboard");
  redirect("/integrations");
}
