"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getMembershipContext } from "@/lib/company";
import { createClient } from "@/lib/supabase/server";

export type CustomerActionState = {
  error?: string;
};

const customerSchema = z.object({
  name: z.string().trim().min(2, "Customer name is required."),
  email: z.preprocess(
    (value) => (value === "" || value === null ? undefined : value),
    z.email().optional(),
  ),
  segment: z.preprocess(
    (value) => (value === "" || value === null ? undefined : value),
    z.string().trim().optional(),
  ),
  externalRef: z.preprocess(
    (value) => (value === "" || value === null ? undefined : value),
    z.string().trim().optional(),
  ),
  paymentTermsDays: z.coerce
    .number()
    .int()
    .min(0, "Payment terms cannot be negative.")
    .max(365, "Payment terms are too large."),
  creditLimit: z.coerce
    .number()
    .min(0, "Credit limit cannot be negative."),
  owner: z.preprocess(
    (value) => (value === "" || value === null ? undefined : value),
    z.string().trim().optional(),
  ),
  risk: z.enum(["Low", "Medium", "High"]),
});

const alertResolveSchema = z.object({
  alertId: z.string().uuid("Invalid alert."),
});

export async function createCustomerAction(
  _prevState: CustomerActionState,
  formData: FormData,
) {
  const membership = await getMembershipContext();

  if (!membership) {
    return { error: "Company membership not found." };
  }

  const parsed = customerSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    segment: formData.get("segment"),
    externalRef: formData.get("externalRef"),
    paymentTermsDays: formData.get("paymentTermsDays"),
    creditLimit: formData.get("creditLimit"),
    owner: formData.get("owner"),
    risk: formData.get("risk"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid customer." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("customers").insert({
    company_id: membership.companyId,
    name: parsed.data.name,
    email: parsed.data.email ?? null,
    segment: parsed.data.segment ?? null,
    external_ref: parsed.data.externalRef ?? null,
    payment_terms_days: parsed.data.paymentTermsDays,
    credit_limit: parsed.data.creditLimit,
    metadata: {
      owner: parsed.data.owner ?? membership.userName ?? membership.userEmail,
      risk: parsed.data.risk,
    },
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/customers");
  revalidatePath("/dashboard");
  redirect("/customers");
}

export async function runCreditAlertScanAction() {
  const membership = await getMembershipContext();

  if (!membership) {
    redirect("/login");
  }

  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);

  const [{ data: customers }, { data: invoices }, { data: existingAlerts }] = await Promise.all([
    supabase
      .from("customers")
      .select("id, name, credit_limit")
      .eq("company_id", membership.companyId),
    supabase
      .from("invoices")
      .select("id, customer_id, balance_due, due_date, status")
      .eq("company_id", membership.companyId)
      .gt("balance_due", 0)
      .in("status", ["scheduled", "sent", "partial", "overdue", "disputed"]),
    supabase
      .from("credit_alerts")
      .select("id, customer_id, reason, status")
      .eq("company_id", membership.companyId)
      .eq("status", "open"),
  ]);

  const openAlertsByCustomer = new Map<string, Set<string>>();
  for (const alert of existingAlerts ?? []) {
    if (!openAlertsByCustomer.has(alert.customer_id)) {
      openAlertsByCustomer.set(alert.customer_id, new Set());
    }
    openAlertsByCustomer.get(alert.customer_id)?.add(alert.reason);
  }

  const invoiceByCustomer = new Map<
    string,
    { openBalance: number; overdueBalance: number; overdueCount: number; openCount: number }
  >();
  for (const invoice of invoices ?? []) {
    const current = invoiceByCustomer.get(invoice.customer_id) ?? {
      openBalance: 0,
      overdueBalance: 0,
      overdueCount: 0,
      openCount: 0,
    };
    const balance = Number(invoice.balance_due);
    current.openBalance += balance;
    current.openCount += 1;
    if (invoice.due_date < today || invoice.status === "overdue") {
      current.overdueBalance += balance;
      current.overdueCount += 1;
    }
    invoiceByCustomer.set(invoice.customer_id, current);
  }

  const inserts: {
    company_id: string;
    customer_id: string;
    severity: "warning" | "critical";
    reason: string;
    status: "open";
    details: {
      customer_name: string;
      open_balance: number;
      credit_limit: number;
      overdue_balance: number;
      overdue_invoices: number;
    };
    created_by: string;
  }[] = [];
  const activeReasons = new Map<string, Set<string>>();

  for (const customer of customers ?? []) {
    const stats = invoiceByCustomer.get(customer.id) ?? {
      openBalance: 0,
      overdueBalance: 0,
      overdueCount: 0,
      openCount: 0,
    };
    const reasons: { reason: string; severity: "warning" | "critical" }[] = [];

    if (Number(customer.credit_limit) > 0 && stats.openBalance > Number(customer.credit_limit)) {
      reasons.push({ reason: "Over credit limit", severity: "critical" });
    } else if (
      Number(customer.credit_limit) > 0 &&
      stats.openBalance >= Number(customer.credit_limit) * 0.85 &&
      stats.openBalance > 0
    ) {
      reasons.push({ reason: "Approaching credit limit", severity: "warning" });
    }

    if (stats.overdueBalance > 0) {
      reasons.push({
        reason: "Overdue receivables exposure",
        severity: stats.overdueBalance > Number(customer.credit_limit || 0) * 0.5 ? "critical" : "warning",
      });
    }

    if (reasons.length) {
      activeReasons.set(customer.id, new Set(reasons.map((entry) => entry.reason)));
    }

    for (const entry of reasons) {
      if (openAlertsByCustomer.get(customer.id)?.has(entry.reason)) {
        continue;
      }

      inserts.push({
        company_id: membership.companyId,
        customer_id: customer.id,
        severity: entry.severity,
        reason: entry.reason,
        status: "open",
        details: {
          customer_name: customer.name,
          open_balance: Number(stats.openBalance.toFixed(2)),
          credit_limit: Number(customer.credit_limit ?? 0),
          overdue_balance: Number(stats.overdueBalance.toFixed(2)),
          overdue_invoices: stats.overdueCount,
        },
        created_by: membership.userId,
      });
    }
  }

  if (inserts.length) {
    await supabase.from("credit_alerts").insert(inserts);
  }

  const alertsToResolve = (existingAlerts ?? []).filter(
    (alert) => !activeReasons.get(alert.customer_id)?.has(alert.reason),
  );

  if (alertsToResolve.length) {
    await supabase
      .from("credit_alerts")
      .update({ status: "resolved", resolved_at: new Date().toISOString() })
      .eq("company_id", membership.companyId)
      .in(
        "id",
        alertsToResolve.map((alert) => alert.id),
      );
  }

  revalidatePath("/customers");
  revalidatePath("/dashboard");
  redirect("/customers");
}

export async function resolveCreditAlertAction(formData: FormData) {
  const membership = await getMembershipContext();

  if (!membership) {
    redirect("/login");
  }

  const parsed = alertResolveSchema.safeParse({
    alertId: formData.get("alertId"),
  });

  if (!parsed.success) {
    redirect("/customers");
  }

  const supabase = await createClient();
  await supabase
    .from("credit_alerts")
    .update({
      status: "resolved",
      resolved_at: new Date().toISOString(),
    })
    .eq("company_id", membership.companyId)
    .eq("id", parsed.data.alertId);

  revalidatePath("/customers");
  revalidatePath("/dashboard");
  redirect("/customers");
}
