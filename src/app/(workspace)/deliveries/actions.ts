"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getMembershipContext } from "@/lib/company";
import { createClient } from "@/lib/supabase/server";

export type DeliveryActionState = {
  error?: string;
};

const deliverySchema = z.object({
  invoiceId: z.string().uuid("Select an invoice."),
  channel: z.enum(["email", "sms", "portal", "postal"]),
  status: z.enum(["queued", "sent", "delivered", "failed", "confirmed"]),
  recipient: z.preprocess(
    (value) => (value === "" || value === null ? undefined : value),
    z.string().trim().optional(),
  ),
  trackingRef: z.preprocess(
    (value) => (value === "" || value === null ? undefined : value),
    z.string().trim().optional(),
  ),
  scheduledFor: z.preprocess(
    (value) => (value === "" || value === null ? undefined : value),
    z.string().optional(),
  ),
  failureReason: z.preprocess(
    (value) => (value === "" || value === null ? undefined : value),
    z.string().trim().optional(),
  ),
});

export async function createDeliveryAction(
  _prevState: DeliveryActionState,
  formData: FormData,
) {
  const membership = await getMembershipContext();

  if (!membership) {
    return { error: "Company membership not found." };
  }

  const parsed = deliverySchema.safeParse({
    invoiceId: formData.get("invoiceId"),
    channel: formData.get("channel"),
    status: formData.get("status"),
    recipient: formData.get("recipient"),
    trackingRef: formData.get("trackingRef"),
    scheduledFor: formData.get("scheduledFor"),
    failureReason: formData.get("failureReason"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid delivery record." };
  }

  if (parsed.data.status === "failed" && !parsed.data.failureReason) {
    return { error: "Add a failure reason when the delivery status is failed." };
  }

  const supabase = await createClient();
  const { data: invoice, error: invoiceError } = await supabase
    .from("invoices")
    .select("id, customer_id")
    .eq("company_id", membership.companyId)
    .eq("id", parsed.data.invoiceId)
    .single();

  if (invoiceError || !invoice) {
    return { error: invoiceError?.message ?? "Invoice not found." };
  }

  const timestamp =
    parsed.data.scheduledFor ? new Date(parsed.data.scheduledFor).toISOString() : null;

  const { error } = await supabase.from("invoice_deliveries").insert({
    company_id: membership.companyId,
    invoice_id: invoice.id,
    customer_id: invoice.customer_id,
    channel: parsed.data.channel,
    status: parsed.data.status,
    recipient: parsed.data.recipient ?? null,
    tracking_ref: parsed.data.trackingRef ?? null,
    scheduled_for: timestamp ?? new Date().toISOString(),
    sent_at:
      ["sent", "delivered", "confirmed"].includes(parsed.data.status) ? timestamp ?? new Date().toISOString() : null,
    delivered_at:
      ["delivered", "confirmed"].includes(parsed.data.status) ? timestamp ?? new Date().toISOString() : null,
    confirmed_at:
      parsed.data.status === "confirmed" ? timestamp ?? new Date().toISOString() : null,
    failure_reason: parsed.data.failureReason ?? null,
    created_by: membership.userId,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/deliveries");
  revalidatePath("/invoices");
  redirect("/deliveries");
}
