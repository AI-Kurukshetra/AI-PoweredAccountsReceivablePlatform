"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getMembershipContext } from "@/lib/company";
import { createClient } from "@/lib/supabase/server";

export type GatewayActionState = {
  error?: string;
};

const gatewaySchema = z.object({
  accountLabel: z.string().trim().min(2, "Account label is required."),
  provider: z.string().trim().min(2, "Provider is required."),
  status: z.enum(["sandbox", "configured", "live", "paused"]),
  supportedChannels: z.string().trim().min(2, "Supported channels are required."),
  checkoutUrl: z.preprocess(
    (value) => (value === "" || value === null ? undefined : value),
    z.url().optional(),
  ),
  webhookStatus: z.enum(["planned", "healthy", "degraded", "not_required"]),
  settlementDays: z.coerce.number().int().min(0).max(30),
  merchantRef: z.preprocess(
    (value) => (value === "" || value === null ? undefined : value),
    z.string().trim().optional(),
  ),
  lastEventAt: z.preprocess(
    (value) => (value === "" || value === null ? undefined : value),
    z.string().optional(),
  ),
});

function parseChannels(rawValue: string) {
  return rawValue
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
}

export async function createGatewayAction(
  _prevState: GatewayActionState,
  formData: FormData,
) {
  const membership = await getMembershipContext();

  if (!membership) {
    return { error: "Company membership not found." };
  }

  const parsed = gatewaySchema.safeParse({
    accountLabel: formData.get("accountLabel"),
    provider: formData.get("provider"),
    status: formData.get("status"),
    supportedChannels: formData.get("supportedChannels"),
    checkoutUrl: formData.get("checkoutUrl"),
    webhookStatus: formData.get("webhookStatus"),
    settlementDays: formData.get("settlementDays"),
    merchantRef: formData.get("merchantRef"),
    lastEventAt: formData.get("lastEventAt"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid gateway account." };
  }

  const supportedChannels = parseChannels(parsed.data.supportedChannels);

  if (!supportedChannels.length) {
    return { error: "Add at least one supported payment channel." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("payment_gateway_accounts").insert({
    company_id: membership.companyId,
    account_label: parsed.data.accountLabel,
    provider: parsed.data.provider,
    status: parsed.data.status,
    supported_channels: supportedChannels,
    checkout_url: parsed.data.checkoutUrl ?? null,
    webhook_status: parsed.data.webhookStatus,
    settlement_days: parsed.data.settlementDays,
    merchant_ref: parsed.data.merchantRef ?? null,
    last_event_at: parsed.data.lastEventAt
      ? new Date(parsed.data.lastEventAt).toISOString()
      : null,
    created_by: membership.userId,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/gateways");
  revalidatePath("/portal");
  redirect("/gateways");
}
