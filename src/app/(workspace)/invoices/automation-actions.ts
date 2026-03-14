"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getMembershipContext } from "@/lib/company";
import { createClient } from "@/lib/supabase/server";

const automationLineItemSchema = z.object({
  description: z.string().trim().min(1, "Line item description is required."),
  quantity: z.coerce.number().positive("Quantity must be greater than zero."),
  unitPrice: z.coerce.number().nonnegative("Unit price cannot be negative."),
  taxRate: z.coerce.number().min(0).max(100),
});

const automationSchema = z.object({
  customerId: z.string().uuid("Select a customer."),
  templateId: z.preprocess(
    (value) => (value === "" || value === null ? undefined : value),
    z.string().uuid().optional(),
  ),
  name: z.string().trim().min(2, "Automation name is required."),
  automationMode: z.enum(["recurring", "contract", "milestone"]),
  cadenceDays: z.coerce
    .number()
    .int()
    .min(1, "Cadence must be at least 1 day.")
    .max(365, "Cadence is too large."),
  nextRunDate: z.string().min(1, "Next run date is required."),
  autoSend: z.preprocess(
    (value) => (value === "on" || value === "true" ? true : false),
    z.boolean(),
  ),
  deliveryChannel: z.preprocess(
    (value) => (value === "" || value === null ? undefined : value),
    z.enum(["email", "sms", "portal", "postal"]).optional(),
  ),
  defaultNotes: z.preprocess(
    (value) => (value === "" || value === null ? undefined : value),
    z.string().trim().optional(),
  ),
  lineItemsJson: z.preprocess(
    (value) => (typeof value === "string" ? value : "[]"),
    z.string(),
  ),
});

const runAutomationsSchema = z.object({
  automationId: z.preprocess(
    (value) => (value === "" || value === null ? undefined : value),
    z.string().uuid().optional(),
  ),
});

function parseLineItems(value: unknown) {
  const parsed = z.array(automationLineItemSchema).safeParse(value);
  return parsed.success ? parsed.data : [];
}

function toDateOnly(value: Date) {
  return value.toISOString().slice(0, 10);
}

function plusDays(dateValue: string, days: number) {
  const value = new Date(`${dateValue}T00:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return toDateOnly(value);
}

function buildAutoInvoiceNumber(issueDate: string) {
  return `AUTO-${issueDate.replaceAll("-", "")}-${randomUUID().slice(0, 8).toUpperCase()}`;
}

export async function createInvoiceAutomationAction(formData: FormData) {
  const membership = await getMembershipContext();

  if (!membership) {
    redirect("/login");
  }

  const parsed = automationSchema.safeParse({
    customerId: formData.get("customerId"),
    templateId: formData.get("templateId"),
    name: formData.get("name"),
    automationMode: formData.get("automationMode"),
    cadenceDays: formData.get("cadenceDays"),
    nextRunDate: formData.get("nextRunDate"),
    autoSend: formData.get("autoSend"),
    deliveryChannel: formData.get("deliveryChannel"),
    defaultNotes: formData.get("defaultNotes"),
    lineItemsJson: formData.get("lineItemsJson"),
  });

  if (!parsed.success) {
    redirect("/invoices");
  }

  let rawLineItems: unknown = [];
  try {
    rawLineItems = JSON.parse(parsed.data.lineItemsJson);
  } catch {
    redirect("/invoices");
  }

  const lineItems = parseLineItems(rawLineItems);
  if (!lineItems.length) {
    redirect("/invoices");
  }

  const supabase = await createClient();
  await supabase.from("invoice_automations").insert({
    company_id: membership.companyId,
    customer_id: parsed.data.customerId,
    template_id: parsed.data.templateId ?? null,
    name: parsed.data.name,
    automation_mode: parsed.data.automationMode,
    cadence_days: parsed.data.cadenceDays,
    next_run_date: parsed.data.nextRunDate,
    auto_send: parsed.data.autoSend,
    delivery_channel: parsed.data.deliveryChannel ?? null,
    default_notes: parsed.data.defaultNotes ?? null,
    line_items: lineItems,
    is_active: true,
    created_by: membership.userId,
  });

  revalidatePath("/invoices");
  revalidatePath("/dashboard");
  redirect("/invoices");
}

export async function runInvoiceAutomationsAction(formData: FormData) {
  const membership = await getMembershipContext();

  if (!membership) {
    redirect("/login");
  }

  const parsed = runAutomationsSchema.safeParse({
    automationId: formData.get("automationId"),
  });

  if (!parsed.success) {
    redirect("/invoices");
  }

  const supabase = await createClient();
  const today = toDateOnly(new Date());

  let query = supabase
    .from("invoice_automations")
    .select(
      "id, customer_id, template_id, name, cadence_days, next_run_date, auto_send, delivery_channel, default_notes, line_items",
    )
    .eq("company_id", membership.companyId)
    .eq("is_active", true)
    .lte("next_run_date", today);

  if (parsed.data.automationId) {
    query = query.eq("id", parsed.data.automationId);
  }

  const { data: automations } = await query;
  if (!automations?.length) {
    revalidatePath("/invoices");
    redirect("/invoices");
  }

  const customerIds = [...new Set(automations.map((automation) => automation.customer_id))];
  const templateIds = [
    ...new Set(
      automations
        .map((automation) => automation.template_id)
        .filter((value): value is string => typeof value === "string"),
    ),
  ];

  const [{ data: customers }, { data: templates }] = await Promise.all([
    supabase
      .from("customers")
      .select("id, email, payment_terms_days")
      .eq("company_id", membership.companyId)
      .in("id", customerIds),
    templateIds.length
      ? supabase
          .from("invoice_templates")
          .select("id, payment_terms_days, delivery_channel")
          .eq("company_id", membership.companyId)
          .in("id", templateIds)
      : Promise.resolve({ data: [] as { id: string; payment_terms_days: number; delivery_channel: string | null }[] }),
  ]);

  const customerMap = new Map((customers ?? []).map((customer) => [customer.id, customer]));
  const templateMap = new Map((templates ?? []).map((template) => [template.id, template]));

  for (const automation of automations) {
    const customer = customerMap.get(automation.customer_id);
    if (!customer) {
      continue;
    }

    const lineItems = parseLineItems(automation.line_items);
    if (!lineItems.length) {
      continue;
    }

    const subtotal = lineItems.reduce(
      (sum, item) => sum + item.quantity * item.unitPrice,
      0,
    );
    const taxTotal = lineItems.reduce(
      (sum, item) => sum + item.quantity * item.unitPrice * (item.taxRate / 100),
      0,
    );
    const totalAmount = Number((subtotal + taxTotal).toFixed(2));
    const issueDate = today;
    const template = automation.template_id
      ? templateMap.get(automation.template_id)
      : null;
    const termsDays = template?.payment_terms_days ?? customer.payment_terms_days ?? 30;
    const dueDate = plusDays(issueDate, termsDays);
    const invoiceNumber = buildAutoInvoiceNumber(issueDate);
    const deliveryChannel = (automation.delivery_channel ??
      template?.delivery_channel) as string | null;

    const { data: createdInvoice } = await supabase
      .from("invoices")
      .insert({
        company_id: membership.companyId,
        customer_id: automation.customer_id,
        invoice_number: invoiceNumber,
        status: automation.auto_send ? "sent" : "scheduled",
        issue_date: issueDate,
        due_date: dueDate,
        subtotal: Number(subtotal.toFixed(2)),
        tax_total: Number(taxTotal.toFixed(2)),
        total_amount: totalAmount,
        balance_due: totalAmount,
        currency: "USD",
        delivery_channel: deliveryChannel,
        notes: automation.default_notes ?? `Generated by automation: ${automation.name}`,
        created_by: membership.userId,
      })
      .select("id")
      .maybeSingle();

    if (!createdInvoice) {
      continue;
    }

    await supabase.from("invoice_line_items").insert(
      lineItems.map((item, index) => ({
        invoice_id: createdInvoice.id,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        tax_rate: item.taxRate,
        line_total: Number((item.quantity * item.unitPrice * (1 + item.taxRate / 100)).toFixed(2)),
        sort_order: index,
      })),
    );

    if (
      automation.auto_send &&
      deliveryChannel &&
      ["email", "sms", "portal", "postal"].includes(deliveryChannel)
    ) {
      const nowIso = new Date().toISOString();
      await supabase.from("invoice_deliveries").insert({
        company_id: membership.companyId,
        invoice_id: createdInvoice.id,
        customer_id: automation.customer_id,
        channel: deliveryChannel,
        status: "sent",
        recipient: customer.email ?? null,
        scheduled_for: nowIso,
        sent_at: nowIso,
        created_by: membership.userId,
      });
    }

    await supabase
      .from("invoice_automations")
      .update({
        next_run_date: plusDays(today, automation.cadence_days),
        last_generated_at: new Date().toISOString(),
      })
      .eq("company_id", membership.companyId)
      .eq("id", automation.id);
  }

  revalidatePath("/invoices");
  revalidatePath("/deliveries");
  revalidatePath("/dashboard");
  redirect("/invoices");
}
