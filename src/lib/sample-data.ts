import type { Database } from "@/types/database";

type CompanyInsert = Database["public"]["Tables"]["companies"]["Insert"];
type CustomerInsert = Database["public"]["Tables"]["customers"]["Insert"];
type InvoiceInsert = Database["public"]["Tables"]["invoices"]["Insert"];
type DeliveryInsert = Database["public"]["Tables"]["invoice_deliveries"]["Insert"];
type PaymentInsert = Database["public"]["Tables"]["payments"]["Insert"];
type GatewayInsert =
  Database["public"]["Tables"]["payment_gateway_accounts"]["Insert"];
type ReminderInsert = Database["public"]["Tables"]["reminders"]["Insert"];
type RecoveryInsert =
  Database["public"]["Tables"]["recovery_snapshots"]["Insert"];
type SecurityControlInsert =
  Database["public"]["Tables"]["security_controls"]["Insert"];
type DisputeInsert = Database["public"]["Tables"]["disputes"]["Insert"];
type DocumentInsert = Database["public"]["Tables"]["documents"]["Insert"];
type TemplateInsert = Database["public"]["Tables"]["invoice_templates"]["Insert"];
type IntegrationInsert =
  Database["public"]["Tables"]["integration_connections"]["Insert"];
type AuditInsert = Database["public"]["Tables"]["audit_logs"]["Insert"];

function isoDate(offsetDays: number) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + offsetDays);
  return date.toISOString().slice(0, 10);
}

function isoDateTime(offsetDays: number, hourUtc: number) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + offsetDays);
  date.setUTCHours(hourUtc, 0, 0, 0);
  return date.toISOString();
}

export function buildSampleWorkspace(company: CompanyInsert) {
  const customers: CustomerInsert[] = [
    {
      company_id: company.id!,
      name: "Northstar Medical Supply",
      email: "ap@northstar.example",
      segment: "Enterprise",
      external_ref: "C-101",
      payment_terms_days: 30,
      portal_enabled: true,
      portal_access_token: `${company.id}-northstar`,
      credit_limit: 350000,
      metadata: { owner: "Aarav Shah", risk: "Medium" },
    },
    {
      company_id: company.id!,
      name: "Atlas Logistics Group",
      email: "finance@atlas.example",
      segment: "Mid-market",
      external_ref: "C-102",
      payment_terms_days: 15,
      portal_enabled: true,
      portal_access_token: `${company.id}-atlas`,
      credit_limit: 180000,
      metadata: { owner: "Neha Jain", risk: "Low" },
    },
    {
      company_id: company.id!,
      name: "BluePeak Retail Holdings",
      email: "controller@bluepeak.example",
      segment: "Strategic",
      external_ref: "C-103",
      payment_terms_days: 45,
      portal_enabled: false,
      portal_access_token: null,
      credit_limit: 420000,
      metadata: { owner: "Kabir Mehta", risk: "High" },
    },
  ];

  return { customers };
}

export function buildSampleInvoices(
  companyId: string,
  userId: string,
  customerMap: Record<string, string>,
) {
  const invoices: InvoiceInsert[] = [
    {
      company_id: companyId,
      customer_id: customerMap["Northstar Medical Supply"],
      invoice_number: "INV-2048",
      status: "partial",
      issue_date: isoDate(-25),
      due_date: isoDate(4),
      subtotal: 88000,
      tax_total: 4450,
      total_amount: 92450,
      balance_due: 67450,
      currency: "USD",
      delivery_channel: "api_sync",
      created_by: userId,
    },
    {
      company_id: companyId,
      customer_id: customerMap["BluePeak Retail Holdings"],
      invoice_number: "INV-2051",
      status: "overdue",
      issue_date: isoDate(-54),
      due_date: isoDate(-10),
      subtotal: 112000,
      tax_total: 6200,
      total_amount: 118200,
      balance_due: 118200,
      currency: "USD",
      delivery_channel: "portal",
      created_by: userId,
    },
    {
      company_id: companyId,
      customer_id: customerMap["Atlas Logistics Group"],
      invoice_number: "INV-2053",
      status: "sent",
      issue_date: isoDate(-9),
      due_date: isoDate(6),
      subtotal: 24500,
      tax_total: 2040,
      total_amount: 26540,
      balance_due: 26540,
      currency: "USD",
      delivery_channel: "email",
      created_by: userId,
    },
    {
      company_id: companyId,
      customer_id: customerMap["Northstar Medical Supply"],
      invoice_number: "INV-2058",
      status: "scheduled",
      issue_date: isoDate(0),
      due_date: isoDate(19),
      subtotal: 51200,
      tax_total: 2800,
      total_amount: 54000,
      balance_due: 54000,
      currency: "USD",
      delivery_channel: "email",
      created_by: userId,
    },
  ];

  return { invoices };
}

export function buildSamplePayments(
  companyId: string,
  customerMap: Record<string, string>,
  invoiceMap: Record<string, string>,
) {
  const payments: PaymentInsert[] = [
    {
      company_id: companyId,
      customer_id: customerMap["Atlas Logistics Group"],
      invoice_id: invoiceMap["INV-2053"],
      amount: 17250,
      status: "settled",
      channel: "ach",
      external_ref: "PMT-901",
      received_at: isoDateTime(0, 4),
    },
    {
      company_id: companyId,
      customer_id: customerMap["Northstar Medical Supply"],
      invoice_id: invoiceMap["INV-2048"],
      amount: 25000,
      status: "pending",
      channel: "wire",
      external_ref: "PMT-902",
      received_at: isoDateTime(-1, 9),
    },
  ];

  return { payments };
}

export function buildSampleInvoiceDeliveries(
  companyId: string,
  userId: string,
  customerMap: Record<string, string>,
  invoiceMap: Record<string, string>,
) {
  const deliveries: DeliveryInsert[] = [
    {
      company_id: companyId,
      invoice_id: invoiceMap["INV-2048"],
      customer_id: customerMap["Northstar Medical Supply"],
      channel: "email",
      status: "delivered",
      recipient: "ap@northstar.example",
      tracking_ref: "SENDGRID-2048",
      scheduled_for: isoDateTime(-24, 8),
      sent_at: isoDateTime(-24, 8),
      delivered_at: isoDateTime(-24, 8),
      created_by: userId,
    },
    {
      company_id: companyId,
      invoice_id: invoiceMap["INV-2053"],
      customer_id: customerMap["Atlas Logistics Group"],
      channel: "portal",
      status: "confirmed",
      recipient: "finance@atlas.example",
      tracking_ref: "PORTAL-2053",
      scheduled_for: isoDateTime(-8, 7),
      sent_at: isoDateTime(-8, 7),
      delivered_at: isoDateTime(-8, 7),
      confirmed_at: isoDateTime(-7, 11),
      created_by: userId,
    },
    {
      company_id: companyId,
      invoice_id: invoiceMap["INV-2058"],
      customer_id: customerMap["Northstar Medical Supply"],
      channel: "sms",
      status: "queued",
      recipient: "+1-415-555-0123",
      scheduled_for: isoDateTime(0, 12),
      created_by: userId,
    },
  ];

  return { deliveries };
}

export function buildSampleReminders(
  companyId: string,
  customerMap: Record<string, string>,
  invoiceMap: Record<string, string>,
) {
  const reminders: ReminderInsert[] = [
    {
      company_id: companyId,
      customer_id: customerMap["BluePeak Retail Holdings"],
      invoice_id: invoiceMap["INV-2051"],
      stage: "7 days overdue",
      channel: "call_task",
      status: "escalated",
      scheduled_for: isoDateTime(1, 10),
    },
    {
      company_id: companyId,
      customer_id: customerMap["Northstar Medical Supply"],
      invoice_id: invoiceMap["INV-2048"],
      stage: "Before due date",
      channel: "email",
      status: "queued",
      scheduled_for: isoDateTime(2, 8),
    },
  ];

  return { reminders };
}

export function buildSampleDisputes(
  companyId: string,
  userId: string,
  customerMap: Record<string, string>,
  invoiceMap: Record<string, string>,
) {
  const disputes: DisputeInsert[] = [
    {
      company_id: companyId,
      customer_id: customerMap["BluePeak Retail Holdings"],
      invoice_id: invoiceMap["INV-2051"],
      title: "PO mismatch",
      description: "Customer claims shipment quantities differ from original PO.",
      status: "open",
      opened_by: userId,
    },
  ];

  return { disputes };
}

export function buildSampleAuditLogs(companyId: string, userId: string) {
  const auditLogs: AuditInsert[] = [
    {
      company_id: companyId,
      actor_id: userId,
      entity_type: "company",
      action: "create",
      details: { message: "Company workspace created" },
    },
  ];

  return { auditLogs };
}

export function buildSampleTemplates(companyId: string, userId: string) {
  const templates: TemplateInsert[] = [
    {
      company_id: companyId,
      name: "Enterprise Renewal",
      description: "Default branded template for monthly enterprise billing.",
      delivery_channel: "email",
      payment_terms_days: 30,
      accent_color: "#3d73e7",
      footer_text: "Questions? Contact ar@northstar.example",
      is_default: true,
      created_by: userId,
    },
    {
      company_id: companyId,
      name: "Portal-First Reminder",
      description: "Optimized for portal delivery and self-service payment links.",
      delivery_channel: "portal",
      payment_terms_days: 15,
      accent_color: "#2c9a69",
      footer_text: "Portal payments settle against invoices automatically.",
      is_default: false,
      created_by: userId,
    },
  ];

  return { templates };
}

export function buildSampleIntegrations(companyId: string, userId: string) {
  const integrations: IntegrationInsert[] = [
    {
      company_id: companyId,
      name: "NetSuite ERP Sync",
      provider: "NetSuite",
      category: "erp",
      status: "healthy",
      health_note: "Customer and invoice sync completed in the last 4 minutes.",
      last_sync_at: isoDateTime(0, 5),
      created_by: userId,
      webhook_url: null,
      config: { direction: "bi-directional" },
    },
    {
      company_id: companyId,
      name: "Stripe Settlement Feed",
      provider: "Stripe",
      category: "payments",
      status: "healthy",
      health_note: "Card and ACH events arrive in real time.",
      last_sync_at: isoDateTime(0, 6),
      created_by: userId,
      webhook_url: "https://example.com/webhooks/stripe",
      config: { retries: 3 },
    },
    {
      company_id: companyId,
      name: "Reminder Webhook Relay",
      provider: "Custom Webhook",
      category: "webhook",
      status: "review",
      health_note: "Two reminder callbacks are waiting for retry.",
      last_sync_at: isoDateTime(-1, 18),
      created_by: userId,
      webhook_url: "https://example.com/webhooks/reminders",
      config: { eventTypes: ["reminder.sent", "invoice.disputed"] },
    },
  ];

  return { integrations };
}

export function buildSampleGatewayAccounts(companyId: string, userId: string) {
  const gateways: GatewayInsert[] = [
    {
      company_id: companyId,
      account_label: "Stripe US Merchant",
      provider: "Stripe",
      status: "live",
      supported_channels: ["card", "ach", "wallet"],
      checkout_url: "https://payments.example.com/checkout",
      webhook_status: "healthy",
      settlement_days: 2,
      merchant_ref: "acct_stripe_us_01",
      last_event_at: isoDateTime(0, 6),
      created_by: userId,
    },
    {
      company_id: companyId,
      account_label: "Bank Wire Instructions",
      provider: "Treasury Ops",
      status: "configured",
      supported_channels: ["wire"],
      checkout_url: null,
      webhook_status: "not_required",
      settlement_days: 1,
      merchant_ref: "wire-desk-01",
      last_event_at: isoDateTime(-1, 15),
      created_by: userId,
    },
  ];

  return { gateways };
}

export function buildSampleRecoverySnapshots(companyId: string, userId: string) {
  const snapshots: RecoveryInsert[] = [
    {
      company_id: companyId,
      snapshot_name: "nightly-prod-2026-03-14",
      scope: "postgres + storage metadata",
      backup_kind: "nightly",
      status: "completed",
      storage_ref: "s3://backups/invoiced/nightly-prod-2026-03-14.dump",
      notes: "Automatic nightly backup retained for 30 days.",
      expires_at: isoDateTime(30, 2),
      restore_tested_at: isoDateTime(-3, 4),
      created_by: userId,
    },
    {
      company_id: companyId,
      snapshot_name: "pre-schema-change-2026-03-10",
      scope: "postgres schema only",
      backup_kind: "manual",
      status: "completed",
      storage_ref: "s3://backups/invoiced/pre-schema-change-2026-03-10.dump",
      notes: "Created before the portal and templates rollout.",
      expires_at: isoDateTime(7, 4),
      restore_tested_at: null,
      created_by: userId,
    },
  ];

  return { snapshots };
}

export function buildSampleSecurityControls(companyId: string, userId: string) {
  const controls: SecurityControlInsert[] = [
    {
      company_id: companyId,
      category: "Access",
      control_name: "Role-based workspace access",
      framework: "SOC 2",
      status: "implemented",
      owner: "Platform admin",
      last_reviewed_at: isoDateTime(-4, 9),
      next_review_due: isoDateTime(26, 9),
      notes: "Owner/admin approval required for elevated roles.",
      created_by: userId,
    },
    {
      company_id: companyId,
      category: "Payments",
      control_name: "Gateway webhook signature verification",
      framework: "PCI DSS",
      status: "monitoring",
      owner: "Payments team",
      last_reviewed_at: isoDateTime(-1, 10),
      next_review_due: isoDateTime(14, 10),
      notes: "Stripe signature validation tracked in the live gateway pipeline.",
      created_by: userId,
    },
    {
      company_id: companyId,
      category: "Recovery",
      control_name: "Quarterly restore drill",
      framework: "SOC 2",
      status: "planned",
      owner: "Infrastructure",
      last_reviewed_at: null,
      next_review_due: isoDateTime(10, 8),
      notes: "Run restore from nightly snapshot into staging and verify portal token integrity.",
      created_by: userId,
    },
  ];

  return { controls };
}

export function buildSampleDocuments(
  companyId: string,
  userId: string,
  customerMap: Record<string, string>,
  invoiceMap: Record<string, string>,
) {
  const documents: DocumentInsert[] = [
    {
      company_id: companyId,
      customer_id: customerMap["Northstar Medical Supply"],
      invoice_id: invoiceMap["INV-2048"],
      kind: "invoice_pdf",
      bucket_path: "company-demo/invoices/INV-2048.pdf",
      uploaded_by: userId,
    },
    {
      company_id: companyId,
      customer_id: customerMap["BluePeak Retail Holdings"],
      invoice_id: invoiceMap["INV-2051"],
      kind: "proof",
      bucket_path: "company-demo/proofs/bluepeak-shipping-proof.pdf",
      uploaded_by: userId,
    },
  ];

  return { documents };
}
