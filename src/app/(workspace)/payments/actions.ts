"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getMembershipContext } from "@/lib/company";
import { createClient } from "@/lib/supabase/server";

export type PaymentActionState = {
  error?: string;
};

const paymentSchema = z.object({
  invoiceId: z.string().uuid("Select an invoice."),
  amount: z.coerce.number().positive("Payment amount must be greater than zero."),
  channel: z.enum(["card", "ach", "wire", "wallet"]),
  status: z.enum(["pending", "settled", "failed", "refunded"]),
  externalRef: z.preprocess(
    (value) => (value === "" || value === null ? undefined : value),
    z.string().trim().optional(),
  ),
  receivedAt: z.preprocess(
    (value) => (value === "" || value === null ? undefined : value),
    z.string().optional(),
  ),
});

export async function createPaymentAction(
  _prevState: PaymentActionState,
  formData: FormData,
) {
  const membership = await getMembershipContext();

  if (!membership) {
    return { error: "Company membership not found." };
  }

  const parsed = paymentSchema.safeParse({
    invoiceId: formData.get("invoiceId"),
    amount: formData.get("amount"),
    channel: formData.get("channel"),
    status: formData.get("status"),
    externalRef: formData.get("externalRef"),
    receivedAt: formData.get("receivedAt"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid payment." };
  }

  const supabase = await createClient();
  const { data: invoice, error: invoiceError } = await supabase
    .from("invoices")
    .select("id, customer_id, balance_due, status")
    .eq("company_id", membership.companyId)
    .eq("id", parsed.data.invoiceId)
    .single();

  if (invoiceError || !invoice) {
    return { error: invoiceError?.message ?? "Invoice not found." };
  }

  if (
    parsed.data.status === "settled" &&
    parsed.data.amount > Number(invoice.balance_due)
  ) {
    return { error: "Payment exceeds the remaining invoice balance." };
  }

  const { error } = await supabase.from("payments").insert({
    company_id: membership.companyId,
    customer_id: invoice.customer_id,
    invoice_id: invoice.id,
    amount: parsed.data.amount,
    channel: parsed.data.channel,
    status: parsed.data.status,
    external_ref: parsed.data.externalRef ?? null,
    received_at: parsed.data.receivedAt
      ? new Date(parsed.data.receivedAt).toISOString()
      : null,
  });

  if (error) {
    return { error: error.message };
  }

  if (parsed.data.status === "settled") {
    const nextBalance = Math.max(
      0,
      Number(invoice.balance_due) - parsed.data.amount,
    );
    const nextStatus =
      nextBalance === 0
        ? "paid"
        : invoice.status === "disputed"
          ? "disputed"
          : "partial";

    const { error: updateError } = await supabase
      .from("invoices")
      .update({
        balance_due: nextBalance,
        status: nextStatus,
      })
      .eq("id", invoice.id)
      .eq("company_id", membership.companyId);

    if (updateError) {
      return { error: updateError.message };
    }
  }

  revalidatePath("/payments");
  revalidatePath("/invoices");
  revalidatePath(`/invoices/${invoice.id}`);
  revalidatePath("/dashboard");
  redirect("/payments");
}
