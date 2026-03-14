"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getMembershipContext } from "@/lib/company";
import { createClient } from "@/lib/supabase/server";

const reminderPolicySchema = z.object({
  name: z.string().trim().min(2, "Policy name is required."),
  triggerType: z.enum(["before_due", "after_due"]),
  daysOffset: z.coerce
    .number()
    .int()
    .min(0, "Days offset cannot be negative.")
    .max(120, "Days offset is too large."),
  channel: z.enum(["email", "sms", "call_task"]),
  stage: z.string().trim().min(2, "Stage label is required."),
  isActive: z.preprocess(
    (value) => (value === "on" || value === "true" ? true : false),
    z.boolean(),
  ),
});

function dateOnly(value: Date) {
  return value.toISOString().slice(0, 10);
}

function addDays(dateValue: string, days: number) {
  const value = new Date(`${dateValue}T09:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString();
}

export async function createReminderPolicyAction(formData: FormData) {
  const membership = await getMembershipContext();

  if (!membership) {
    redirect("/login");
  }

  const parsed = reminderPolicySchema.safeParse({
    name: formData.get("name"),
    triggerType: formData.get("triggerType"),
    daysOffset: formData.get("daysOffset"),
    channel: formData.get("channel"),
    stage: formData.get("stage"),
    isActive: formData.get("isActive"),
  });

  if (!parsed.success) {
    redirect("/collections");
  }

  const supabase = await createClient();
  await supabase.from("reminder_policies").insert({
    company_id: membership.companyId,
    name: parsed.data.name,
    trigger_type: parsed.data.triggerType,
    days_offset: parsed.data.daysOffset,
    stage: parsed.data.stage,
    channel: parsed.data.channel,
    is_active: parsed.data.isActive,
    created_by: membership.userId,
  });

  revalidatePath("/collections");
  revalidatePath("/dashboard");
  revalidatePath("/analytics");
  redirect("/collections");
}

export async function runReminderAutomationAction() {
  const membership = await getMembershipContext();

  if (!membership) {
    redirect("/login");
  }

  const supabase = await createClient();
  const today = dateOnly(new Date());
  const todayStart = `${today}T00:00:00.000Z`;

  const [{ data: policies }, { data: invoices }] = await Promise.all([
    supabase
      .from("reminder_policies")
      .select("id, trigger_type, days_offset, channel, stage")
      .eq("company_id", membership.companyId)
      .eq("is_active", true),
    supabase
      .from("invoices")
      .select("id, customer_id, due_date, status, balance_due")
      .eq("company_id", membership.companyId)
      .in("status", ["scheduled", "sent", "partial", "overdue", "disputed"])
      .gt("balance_due", 0),
  ]);

  if (!policies?.length || !invoices?.length) {
    revalidatePath("/collections");
    revalidatePath("/dashboard");
    redirect("/collections");
  }

  const invoiceIds = invoices.map((invoice) => invoice.id);
  const { data: existingReminders } = await supabase
    .from("reminders")
    .select("invoice_id, channel, stage")
    .eq("company_id", membership.companyId)
    .in("invoice_id", invoiceIds);

  const existingKeys = new Set(
    (existingReminders ?? []).map(
      (reminder) => `${reminder.invoice_id}|${reminder.channel}|${reminder.stage.toLowerCase()}`,
    ),
  );

  const inserts: {
    company_id: string;
    invoice_id: string;
    customer_id: string;
    stage: string;
    channel: "email" | "sms" | "call_task";
    status: "queued";
    scheduled_for: string;
  }[] = [];

  const overdueInvoiceIds: string[] = [];

  for (const invoice of invoices) {
    const isPastDue = invoice.due_date < today;
    if (isPastDue && ["scheduled", "sent", "partial"].includes(invoice.status)) {
      overdueInvoiceIds.push(invoice.id);
    }

    for (const policy of policies) {
      const scheduledFor =
        policy.trigger_type === "before_due"
          ? addDays(invoice.due_date, -policy.days_offset)
          : addDays(invoice.due_date, policy.days_offset);

      if (policy.trigger_type === "before_due" && scheduledFor < todayStart) {
        continue;
      }

      if (policy.trigger_type === "after_due" && !isPastDue) {
        continue;
      }

      const key = `${invoice.id}|${policy.channel}|${policy.stage.toLowerCase()}`;
      if (existingKeys.has(key)) {
        continue;
      }

      existingKeys.add(key);
      inserts.push({
        company_id: membership.companyId,
        invoice_id: invoice.id,
        customer_id: invoice.customer_id,
        stage: policy.stage,
        channel: policy.channel,
        status: "queued",
        scheduled_for: scheduledFor < todayStart ? new Date().toISOString() : scheduledFor,
      });
    }
  }

  if (overdueInvoiceIds.length) {
    await supabase
      .from("invoices")
      .update({ status: "overdue" })
      .eq("company_id", membership.companyId)
      .in("id", overdueInvoiceIds);
  }

  if (inserts.length) {
    await supabase.from("reminders").insert(inserts);
  }

  revalidatePath("/collections");
  revalidatePath("/dashboard");
  revalidatePath("/analytics");
  revalidatePath("/invoices");
  redirect("/collections");
}
