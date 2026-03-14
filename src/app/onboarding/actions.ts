"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { slugify } from "@/lib/slug";
import {
  buildSampleAuditLogs,
  buildSampleDocuments,
  buildSampleGatewayAccounts,
  buildSampleDisputes,
  buildSampleInvoiceDeliveries,
  buildSampleIntegrations,
  buildSampleInvoices,
  buildSamplePayments,
  buildSampleRecoverySnapshots,
  buildSampleReminders,
  buildSampleSecurityControls,
  buildSampleTemplates,
  buildSampleWorkspace,
} from "@/lib/sample-data";

export type OnboardingState = {
  error?: string;
};

const onboardingSchema = z.object({
  companyName: z.string().trim().min(2, "Enter your company name."),
  legalName: z.preprocess(
    (value) => (value === null || value === "" ? undefined : value),
    z.string().trim().optional(),
  ),
  baseCurrency: z.string().trim().length(3, "Use a 3-letter currency code."),
  seedDemoData: z.preprocess(
    (value) => (value === null ? undefined : value),
    z.union([z.literal("on"), z.literal("true"), z.literal("")]).optional(),
  ),
});

async function generateUniqueSlug(baseName: string) {
  const admin = createAdminClient();
  const baseSlug = slugify(baseName) || "workspace";
  let slug = baseSlug;

  for (let attempt = 0; attempt < 6; attempt += 1) {
    const { data: existing } = await admin
      .from("companies")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();

    if (!existing) {
      return slug;
    }

    slug = `${baseSlug}-${Math.random().toString(36).slice(2, 6)}`;
  }

  return `${baseSlug}-${Date.now().toString(36).slice(-5)}`;
}

export async function createCompanyAction(
  _prevState: OnboardingState,
  formData: FormData,
) {
  const parsed = onboardingSchema.safeParse({
    companyName: formData.get("companyName"),
    legalName: formData.get("legalName"),
    baseCurrency: formData.get("baseCurrency"),
    seedDemoData: formData.get("seedDemoData"),
  });

  if (!parsed.success) {
    return {
      error:
        parsed.error.issues[0]?.message ?? "Invalid onboarding information.",
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You need to sign in before creating a company." };
  }

  const admin = createAdminClient();

  const { data: existingMembership } = await admin
    .from("company_members")
    .select("id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (existingMembership) {
    redirect("/dashboard");
  }

  const slug = await generateUniqueSlug(parsed.data.companyName);

  const { data: company, error: companyError } = await admin
    .from("companies")
    .insert({
      name: parsed.data.companyName,
      legal_name: parsed.data.legalName || null,
      base_currency: parsed.data.baseCurrency.toUpperCase(),
      slug,
      created_by: user.id,
    })
    .select("id, name, slug")
    .single();

  if (companyError || !company) {
    return { error: companyError?.message ?? "Could not create company." };
  }

  const { error: memberError } = await admin.from("company_members").insert({
    company_id: company.id,
    user_id: user.id,
    role: "owner",
  });

  if (memberError) {
    return { error: memberError.message };
  }

  const shouldSeed = parsed.data.seedDemoData === "on";

  if (shouldSeed) {
    const workspaceSeed = buildSampleWorkspace({
      id: company.id,
      name: company.name,
      slug: company.slug,
      base_currency: parsed.data.baseCurrency.toUpperCase(),
      created_by: user.id,
    });

    const { data: customers, error: customerError } = await admin
      .from("customers")
      .insert(workspaceSeed.customers)
      .select("id, name");

    if (customerError) {
      return { error: customerError.message };
    }

    const customerMap = Object.fromEntries(
      (customers ?? []).map((customer) => [customer.name, customer.id]),
    );

    const { invoices } = buildSampleInvoices(company.id, user.id, customerMap);
    const { data: insertedInvoices, error: invoiceError } = await admin
      .from("invoices")
      .insert(invoices)
      .select("id, invoice_number");

    if (invoiceError) {
      return { error: invoiceError.message };
    }

    const invoiceMap = Object.fromEntries(
      (insertedInvoices ?? []).map((invoice) => [invoice.invoice_number, invoice.id]),
    );

    const { payments } = buildSamplePayments(company.id, customerMap, invoiceMap);
    const { error: paymentError } = await admin.from("payments").insert(payments);
    if (paymentError) {
      return { error: paymentError.message };
    }

    const { deliveries } = buildSampleInvoiceDeliveries(
      company.id,
      user.id,
      customerMap,
      invoiceMap,
    );
    const { error: deliveryError } = await admin
      .from("invoice_deliveries")
      .insert(deliveries);
    if (deliveryError) {
      return { error: deliveryError.message };
    }

    const { reminders } = buildSampleReminders(company.id, customerMap, invoiceMap);
    const { error: reminderError } = await admin
      .from("reminders")
      .insert(reminders);
    if (reminderError) {
      return { error: reminderError.message };
    }

    const { disputes } = buildSampleDisputes(
      company.id,
      user.id,
      customerMap,
      invoiceMap,
    );
    const { error: disputeError } = await admin.from("disputes").insert(disputes);
    if (disputeError) {
      return { error: disputeError.message };
    }

    const { auditLogs } = buildSampleAuditLogs(company.id, user.id);
    const { error: auditError } = await admin.from("audit_logs").insert(auditLogs);
    if (auditError) {
      return { error: auditError.message };
    }

    const { templates } = buildSampleTemplates(company.id, user.id);
    const { error: templateError } = await admin
      .from("invoice_templates")
      .insert(templates);
    if (templateError) {
      return { error: templateError.message };
    }

    const { integrations } = buildSampleIntegrations(company.id, user.id);
    const { error: integrationError } = await admin
      .from("integration_connections")
      .insert(integrations);
    if (integrationError) {
      return { error: integrationError.message };
    }

    const { gateways } = buildSampleGatewayAccounts(company.id, user.id);
    const { error: gatewayError } = await admin
      .from("payment_gateway_accounts")
      .insert(gateways);
    if (gatewayError) {
      return { error: gatewayError.message };
    }

    const { documents } = buildSampleDocuments(
      company.id,
      user.id,
      customerMap,
      invoiceMap,
    );
    const { error: documentError } = await admin.from("documents").insert(documents);
    if (documentError) {
      return { error: documentError.message };
    }

    const { snapshots } = buildSampleRecoverySnapshots(company.id, user.id);
    const { error: recoveryError } = await admin
      .from("recovery_snapshots")
      .insert(snapshots);
    if (recoveryError) {
      return { error: recoveryError.message };
    }

    const { controls } = buildSampleSecurityControls(company.id, user.id);
    const { error: controlsError } = await admin
      .from("security_controls")
      .insert(controls);
    if (controlsError) {
      return { error: controlsError.message };
    }
  }

  redirect("/dashboard");
}
