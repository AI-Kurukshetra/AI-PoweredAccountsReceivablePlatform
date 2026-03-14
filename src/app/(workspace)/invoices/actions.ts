"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getMembershipContext } from "@/lib/company";
import { createClient } from "@/lib/supabase/server";

export type InvoiceActionState = {
  error?: string;
};

const lineItemSchema = z.object({
  description: z.string().trim().min(1, "Line item description is required."),
  quantity: z.coerce.number().positive("Quantity must be greater than zero."),
  unitPrice: z.coerce.number().nonnegative("Unit price cannot be negative."),
  taxRate: z.coerce
    .number()
    .min(0, "Tax rate cannot be negative.")
    .max(100, "Tax rate must be 100 or below."),
});

const invoiceSchema = z.object({
  customerId: z.string().uuid("Select a customer."),
  invoiceNumber: z.string().trim().min(2, "Invoice number is required."),
  issueDate: z.string().min(1, "Issue date is required."),
  dueDate: z.string().min(1, "Due date is required."),
  amount: z.preprocess(
    (value) => (value === "" || value === null ? undefined : value),
    z.coerce.number().positive("Amount must be greater than zero.").optional(),
  ),
  status: z.enum([
    "draft",
    "scheduled",
    "sent",
    "partial",
    "overdue",
    "paid",
    "disputed",
  ]),
  deliveryChannel: z.preprocess(
    (value) => (value === "" || value === null ? undefined : value),
    z.string().trim().optional(),
  ),
  notes: z.preprocess(
    (value) => (value === "" || value === null ? undefined : value),
    z.string().trim().optional(),
  ),
  lineItemsJson: z.preprocess(
    (value) => (typeof value === "string" ? value : "[]"),
    z.string(),
  ),
});

export async function createInvoiceAction(
  _prevState: InvoiceActionState,
  formData: FormData,
) {
  const membership = await getMembershipContext();

  if (!membership) {
    return { error: "Company membership not found." };
  }

  const parsed = invoiceSchema.safeParse({
    customerId: formData.get("customerId"),
    invoiceNumber: formData.get("invoiceNumber"),
    issueDate: formData.get("issueDate"),
    dueDate: formData.get("dueDate"),
    amount: formData.get("amount"),
    status: formData.get("status"),
    deliveryChannel: formData.get("deliveryChannel"),
    notes: formData.get("notes"),
    lineItemsJson: formData.get("lineItemsJson"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid invoice." };
  }

  let rawLineItems: unknown[] = [];
  try {
    rawLineItems = JSON.parse(parsed.data.lineItemsJson);
  } catch {
    return { error: "Could not parse invoice line items." };
  }

  const lineItems = z.array(lineItemSchema).safeParse(
    Array.isArray(rawLineItems)
      ? rawLineItems.filter((item) => {
          if (!item || typeof item !== "object") {
            return false;
          }

          const candidate = item as Record<string, unknown>;
          return Boolean(
            String(candidate.description ?? "").trim() ||
              String(candidate.quantity ?? "").trim() ||
              String(candidate.unitPrice ?? "").trim(),
          );
        })
      : [],
  );

  if (!lineItems.success) {
    return { error: lineItems.error.issues[0]?.message ?? "Invalid line item." };
  }

  const subtotal = lineItems.data.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0,
  );
  const taxTotal = lineItems.data.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice * (item.taxRate / 100),
    0,
  );
  const computedTotal = subtotal + taxTotal;
  const totalAmount = lineItems.data.length
    ? computedTotal
    : (parsed.data.amount ?? 0);
  const invoiceSubtotal = lineItems.data.length ? subtotal : totalAmount;
  const invoiceTaxTotal = lineItems.data.length ? taxTotal : 0;

  if (totalAmount <= 0) {
    return {
      error:
        "Add at least one valid line item or enter a fallback invoice amount.",
    };
  }

  const supabase = await createClient();
  const { data: invoice, error } = await supabase
    .from("invoices")
    .insert({
      company_id: membership.companyId,
      customer_id: parsed.data.customerId,
      invoice_number: parsed.data.invoiceNumber,
      status: parsed.data.status,
      issue_date: parsed.data.issueDate,
      due_date: parsed.data.dueDate,
      subtotal: invoiceSubtotal,
      tax_total: invoiceTaxTotal,
      total_amount: totalAmount,
      balance_due: parsed.data.status === "paid" ? 0 : totalAmount,
      currency: "USD",
      delivery_channel: parsed.data.deliveryChannel ?? null,
      notes: parsed.data.notes ?? null,
      created_by: membership.userId,
    })
    .select("id")
    .single();

  if (error || !invoice) {
    return { error: error?.message ?? "Could not create invoice." };
  }

  if (lineItems.data.length) {
    const { error: lineItemError } = await supabase
      .from("invoice_line_items")
      .insert(
        lineItems.data.map((item, index) => ({
          invoice_id: invoice.id,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unitPrice,
          tax_rate: item.taxRate,
          line_total:
            item.quantity * item.unitPrice * (1 + item.taxRate / 100),
          sort_order: index,
        })),
      );

    if (lineItemError) {
      return { error: lineItemError.message };
    }
  }

  const normalizedChannel = (parsed.data.deliveryChannel ?? "").trim().toLowerCase();
  if (
    invoice &&
    ["email", "sms", "portal", "postal"].includes(normalizedChannel) &&
    parsed.data.status !== "draft"
  ) {
    const { data: customer } = await supabase
      .from("customers")
      .select("id, email")
      .eq("company_id", membership.companyId)
      .eq("id", parsed.data.customerId)
      .maybeSingle();

    await supabase.from("invoice_deliveries").insert({
      company_id: membership.companyId,
      invoice_id: invoice.id,
      customer_id: parsed.data.customerId,
      channel: normalizedChannel,
      status: parsed.data.status === "scheduled" ? "queued" : "sent",
      recipient: customer?.email ?? null,
      scheduled_for: new Date().toISOString(),
      sent_at: parsed.data.status === "scheduled" ? null : new Date().toISOString(),
      created_by: membership.userId,
    });
  }

  revalidatePath("/invoices");
  revalidatePath(`/invoices/${invoice.id}`);
  revalidatePath("/deliveries");
  revalidatePath("/dashboard");
  redirect("/invoices");
}
