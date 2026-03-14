import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

function loadEnvFile(relativePath) {
  const fullPath = path.join(projectRoot, relativePath);
  if (!fs.existsSync(fullPath)) {
    return;
  }

  const content = fs.readFileSync(fullPath, "utf8");
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separator = trimmed.indexOf("=");
    if (separator === -1) {
      continue;
    }

    const key = trimmed.slice(0, separator).trim();
    let value = trimmed.slice(separator + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

loadEnvFile(".env.local");
loadEnvFile(".env");

const requiredEnv = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
];

for (const key of requiredEnv) {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable ${key}.`);
  }
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  },
);

const REQUIRED_CORE_TABLES = [
  "companies",
  "profiles",
  "company_members",
  "customers",
  "invoices",
  "invoice_line_items",
  "payments",
  "reminders",
  "disputes",
  "documents",
  "audit_logs",
];

const OPTIONAL_TABLES = [
  "invoice_templates",
  "integration_connections",
  "invoice_deliveries",
  "payment_gateway_accounts",
  "recovery_snapshots",
  "security_controls",
  "invoice_automations",
  "reminder_policies",
  "credit_alerts",
  "integration_sync_runs",
];

const REQUIRED_CUSTOMER_COLUMNS = [
  "portal_enabled",
  "portal_access_token",
];

const REQUIRED_MIGRATION_FILES = [
  "supabase/migrations/20260314120000_initial_invoice_mvp.sql",
  "supabase/migrations/20260314153000_priority_modules.sql",
  "supabase/migrations/20260314190000_missing_must_have_modules.sql",
  "supabase/migrations/20260314213000_must_have_automation_depth.sql",
];

const DEMO_OWNER = {
  email: process.env.DEMO_OWNER_EMAIL ?? "evelyn.carter@ridgeway-demo.example",
  password: process.env.DEMO_OWNER_PASSWORD ?? "OwnerDemo#2026",
  fullName: "Evelyn Carter",
};

const DEMO_COMPANY = {
  name: "Ridgeway Industrial Supply",
  legalName: "Ridgeway Industrial Supply Holdings LLC",
  slug: "ridgeway-industrial-supply",
  baseCurrency: "USD",
};

const baseDate = new Date("2026-03-14T10:00:00.000Z");

function addDays(days, hours = 0, minutes = 0) {
  const value = new Date(baseDate);
  value.setUTCDate(value.getUTCDate() + days);
  value.setUTCHours(hours, minutes, 0, 0);
  return value.toISOString();
}

function isoDate(days) {
  return addDays(days).slice(0, 10);
}

function makePortalToken(ref) {
  return `${DEMO_COMPANY.slug}-${ref.toLowerCase()}`;
}

function lineItemsForInvoice(items) {
  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const taxTotal = items.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice * (item.taxRate / 100),
    0,
  );
  return {
    subtotal,
    taxTotal,
    total: subtotal + taxTotal,
    items,
  };
}

async function expectNoError(result, label) {
  if (result.error) {
    throw new Error(`${label}: ${result.error.message}`);
  }

  return result.data;
}

async function fetchAvailableTables() {
  const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/`, {
    headers: {
      apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      Accept: "application/openapi+json",
    },
  });

  if (!response.ok) {
    throw new Error(`Could not inspect schema via REST API (status ${response.status}).`);
  }

  const openApi = await response.json();
  const tableNames = Object.keys(openApi.paths ?? {}).map((pathKey) => pathKey.replace(/^\//, ""));
  return new Set(tableNames);
}

function buildMigrationHintMessage() {
  return [
    "Run these migrations in your Supabase SQL Editor for the same project used by NEXT_PUBLIC_SUPABASE_URL:",
    ...REQUIRED_MIGRATION_FILES.map((filePath, index) => `${index + 1}. ${filePath}`),
    "Then run: NOTIFY pgrst, 'reload schema';",
  ].join("\n");
}

async function inspectSchemaCapabilities() {
  const availableTables = await fetchAvailableTables();
  const missingCoreTables = REQUIRED_CORE_TABLES.filter((tableName) => !availableTables.has(tableName));
  const missingOptionalTables = OPTIONAL_TABLES.filter((tableName) => !availableTables.has(tableName));

  if (missingCoreTables.length > 0) {
    throw new Error(
      `Schema prerequisites missing. Missing core tables: ${missingCoreTables.join(", ")}\n${buildMigrationHintMessage()}`,
    );
  }

  const { error: customerColumnsError } = await supabase
    .from("customers")
    .select(REQUIRED_CUSTOMER_COLUMNS.join(", "))
    .limit(1);

  if (customerColumnsError) {
    return {
      availableTables,
      hasCustomerPortalColumns: false,
      missingOptionalTables,
    };
  }

  return {
    availableTables,
    hasCustomerPortalColumns: true,
    missingOptionalTables,
  };
}

async function findOrCreateOwner() {
  const {
    data: { users },
    error: listError,
  } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });

  if (listError) {
    throw new Error(`Could not list auth users: ${listError.message}`);
  }

  let owner = users.find((user) => user.email === DEMO_OWNER.email);

  if (!owner) {
    const {
      data,
      error,
    } = await supabase.auth.admin.createUser({
      email: DEMO_OWNER.email,
      password: DEMO_OWNER.password,
      email_confirm: true,
      user_metadata: {
        full_name: DEMO_OWNER.fullName,
      },
    });

    if (error || !data.user) {
      throw new Error(`Could not create demo owner: ${error?.message ?? "Unknown error"}`);
    }

    owner = data.user;
  } else {
    const { error } = await supabase.auth.admin.updateUserById(owner.id, {
      password: DEMO_OWNER.password,
      email_confirm: true,
      user_metadata: {
        ...(owner.user_metadata ?? {}),
        full_name: DEMO_OWNER.fullName,
      },
    });

    if (error) {
      throw new Error(`Could not update demo owner: ${error.message}`);
    }
  }

  const { error: profileError } = await supabase.from("profiles").upsert({
    id: owner.id,
    email: DEMO_OWNER.email,
    full_name: DEMO_OWNER.fullName,
  });

  if (profileError) {
    throw new Error(`Could not upsert owner profile: ${profileError.message}`);
  }

  return owner;
}

async function findOrCreateCompany(ownerId) {
  const existing = await supabase
    .from("companies")
    .select("id")
    .eq("slug", DEMO_COMPANY.slug)
    .maybeSingle();

  if (existing.error) {
    throw new Error(`Could not query company: ${existing.error.message}`);
  }

  if (existing.data) {
    const { error } = await supabase
      .from("companies")
      .update({
        name: DEMO_COMPANY.name,
        legal_name: DEMO_COMPANY.legalName,
        base_currency: DEMO_COMPANY.baseCurrency,
        created_by: ownerId,
      })
      .eq("id", existing.data.id);

    if (error) {
      throw new Error(`Could not update demo company: ${error.message}`);
    }

    return existing.data.id;
  }

  const inserted = await supabase
    .from("companies")
    .insert({
      name: DEMO_COMPANY.name,
      legal_name: DEMO_COMPANY.legalName,
      slug: DEMO_COMPANY.slug,
      base_currency: DEMO_COMPANY.baseCurrency,
      created_by: ownerId,
    })
    .select("id")
    .single();

  if (inserted.error || !inserted.data) {
    throw new Error(`Could not create demo company: ${inserted.error?.message ?? "Unknown error"}`);
  }

  return inserted.data.id;
}

async function clearCompanyData(companyId, capabilities) {
  const tablesToDeleteByCompany = [
    "integration_sync_runs",
    "credit_alerts",
    "documents",
    "reminders",
    "reminder_policies",
    "disputes",
    "payments",
    "invoice_deliveries",
    "invoice_automations",
    "invoice_templates",
    "integration_connections",
    "payment_gateway_accounts",
    "recovery_snapshots",
    "security_controls",
    "audit_logs",
    "invoices",
    "customers",
  ];

  for (const table of tablesToDeleteByCompany) {
    if (!capabilities.availableTables.has(table)) {
      continue;
    }
    const { error } = await supabase.from(table).delete().eq("company_id", companyId);
    if (error) {
      throw new Error(`Could not clear ${table}: ${error.message}`);
    }
  }

  const { error: memberDeleteError } = await supabase
    .from("company_members")
    .delete()
    .eq("company_id", companyId);

  if (memberDeleteError) {
    throw new Error(`Could not clear company members: ${memberDeleteError.message}`);
  }
}

async function ensureOwnerMembership(companyId, ownerId) {
  const { error } = await supabase.from("company_members").insert({
    company_id: companyId,
    user_id: ownerId,
    role: "owner",
  });

  if (error) {
    throw new Error(`Could not create owner membership: ${error.message}`);
  }
}

async function seedCompany(companyId, ownerId, capabilities) {
  let automationCount = 0;
  let reminderPolicyCount = 0;
  let creditAlertCount = 0;
  let syncRunCount = 0;

  const customers = [
    {
      key: "meridian",
      name: "Meridian Medical Group",
      email: "ap@meridian-medical.com",
      segment: "Enterprise",
      external_ref: "C-401",
      payment_terms_days: 30,
      credit_limit: 150000,
      portal_enabled: true,
      portal_access_token: makePortalToken("C-401"),
      billing_address: {
        line1: "1800 Westlake Avenue",
        city: "Seattle",
        state: "WA",
        postal_code: "98109",
        country: "US",
      },
      metadata: {
        owner: "Alicia Morgan",
        risk: "Low",
        industry: "Healthcare",
      },
    },
    {
      key: "atlas",
      name: "Atlas Freight Services",
      email: "finance@atlasfreight.com",
      segment: "Mid-market",
      external_ref: "C-402",
      payment_terms_days: 21,
      credit_limit: 95000,
      portal_enabled: true,
      portal_access_token: makePortalToken("C-402"),
      billing_address: {
        line1: "475 Commerce Way",
        city: "Dallas",
        state: "TX",
        postal_code: "75207",
        country: "US",
      },
      metadata: {
        owner: "Marcus Lee",
        risk: "Low",
        industry: "Logistics",
      },
    },
    {
      key: "bluepeak",
      name: "BluePeak Retail Holdings",
      email: "controller@bluepeakretail.com",
      segment: "Strategic",
      external_ref: "C-403",
      payment_terms_days: 30,
      credit_limit: 240000,
      portal_enabled: true,
      portal_access_token: makePortalToken("C-403"),
      billing_address: {
        line1: "220 Park Row",
        city: "Chicago",
        state: "IL",
        postal_code: "60601",
        country: "US",
      },
      metadata: {
        owner: "Jenna Flores",
        risk: "Medium",
        industry: "Retail",
      },
    },
    {
      key: "harborline",
      name: "Harborline Hotels",
      email: "payables@harborlinehotels.com",
      segment: "Growth",
      external_ref: "C-404",
      payment_terms_days: 45,
      credit_limit: 110000,
      portal_enabled: false,
      portal_access_token: null,
      billing_address: {
        line1: "91 Harbor Street",
        city: "Miami",
        state: "FL",
        postal_code: "33132",
        country: "US",
      },
      metadata: {
        owner: "Priya Shah",
        risk: "High",
        industry: "Hospitality",
      },
    },
    {
      key: "summit",
      name: "Summit Precision Parts",
      email: "ap@summitprecision.com",
      segment: "Mid-market",
      external_ref: "C-405",
      payment_terms_days: 20,
      credit_limit: 78000,
      portal_enabled: true,
      portal_access_token: makePortalToken("C-405"),
      billing_address: {
        line1: "17 Tooling Park",
        city: "Cleveland",
        state: "OH",
        postal_code: "44114",
        country: "US",
      },
      metadata: {
        owner: "David Kim",
        risk: "Low",
        industry: "Manufacturing",
      },
    },
    {
      key: "greenfield",
      name: "Greenfield Facilities Management",
      email: "finance@greenfieldfm.com",
      segment: "Growth",
      external_ref: "C-406",
      payment_terms_days: 30,
      credit_limit: 87000,
      portal_enabled: false,
      portal_access_token: null,
      billing_address: {
        line1: "4100 Civic Center Drive",
        city: "Phoenix",
        state: "AZ",
        postal_code: "85004",
        country: "US",
      },
      metadata: {
        owner: "Rosa Turner",
        risk: "Medium",
        industry: "Facilities",
      },
    },
    {
      key: "polaris",
      name: "Polaris Data Centers",
      email: "billing@polarisdc.com",
      segment: "Enterprise",
      external_ref: "C-407",
      payment_terms_days: 15,
      credit_limit: 320000,
      portal_enabled: true,
      portal_access_token: makePortalToken("C-407"),
      billing_address: {
        line1: "8200 Meridian Parkway",
        city: "Ashburn",
        state: "VA",
        postal_code: "20147",
        country: "US",
      },
      metadata: {
        owner: "Noah Bennett",
        risk: "Low",
        industry: "Technology",
      },
    },
    {
      key: "westgate",
      name: "Westgate Food Distribution",
      email: "payables@westgatefoods.com",
      segment: "Growth",
      external_ref: "C-408",
      payment_terms_days: 25,
      credit_limit: 125000,
      portal_enabled: true,
      portal_access_token: makePortalToken("C-408"),
      billing_address: {
        line1: "6500 Market Center Blvd",
        city: "Atlanta",
        state: "GA",
        postal_code: "30336",
        country: "US",
      },
      metadata: {
        owner: "Tyler Brooks",
        risk: "Medium",
        industry: "Distribution",
      },
    },
  ].map((customer) => {
    const entry = { ...customer };
    delete entry.key;
    return {
      company_id: companyId,
      ...entry,
    };
  });

  const customersToInsert = capabilities.hasCustomerPortalColumns
    ? customers
    : customers.map((customer) => {
        const sanitized = { ...customer };
        delete sanitized.portal_enabled;
        delete sanitized.portal_access_token;
        return sanitized;
      });

  const insertedCustomers = await expectNoError(
    await supabase.from("customers").insert(customersToInsert).select("id, name, external_ref"),
    "Could not insert customers",
  );

  const customerMap = Object.fromEntries(insertedCustomers.map((row) => [row.name, row.id]));

  const invoiceBlueprints = [
    {
      key: "INV-260314-001",
      customerName: "Meridian Medical Group",
      status: "sent",
      issueDate: isoDate(-9),
      dueDate: isoDate(21),
      deliveryChannel: "email",
      notes: "March consumables replenishment for urgent care locations.",
      lines: lineItemsForInvoice([
        { description: "Sterile glove packs", quantity: 180, unitPrice: 120, taxRate: 8.25 },
        { description: "Surgical mask pallets", quantity: 32, unitPrice: 690, taxRate: 8.25 },
      ]),
    },
    {
      key: "INV-260314-002",
      customerName: "Atlas Freight Services",
      status: "paid",
      issueDate: isoDate(-33),
      dueDate: isoDate(-4),
      deliveryChannel: "portal",
      notes: "Fleet maintenance supply replenishment.",
      lines: lineItemsForInvoice([
        { description: "Hydraulic coupler kits", quantity: 48, unitPrice: 240, taxRate: 7.5 },
        { description: "Brake assembly packs", quantity: 26, unitPrice: 240, taxRate: 7.5 },
      ]),
    },
    {
      key: "INV-260314-003",
      customerName: "BluePeak Retail Holdings",
      status: "partial",
      issueDate: isoDate(-25),
      dueDate: isoDate(4),
      deliveryChannel: "email",
      notes: "Store refit fixtures for the spring merchandising rollout.",
      lines: lineItemsForInvoice([
        { description: "Display rack assemblies", quantity: 18, unitPrice: 2400, taxRate: 6.25 },
        { description: "Backroom shelving kits", quantity: 12, unitPrice: 1800, taxRate: 6.25 },
      ]),
    },
    {
      key: "INV-260314-004",
      customerName: "Harborline Hotels",
      status: "overdue",
      issueDate: isoDate(-53),
      dueDate: isoDate(-8),
      deliveryChannel: "email",
      notes: "Room operations restock package for three coastal properties.",
      lines: lineItemsForInvoice([
        { description: "Commercial linen sets", quantity: 110, unitPrice: 145, taxRate: 7 },
        { description: "Housekeeping chemical drums", quantity: 18, unitPrice: 440, taxRate: 7 },
      ]),
    },
    {
      key: "INV-260314-005",
      customerName: "Summit Precision Parts",
      status: "scheduled",
      issueDate: isoDate(1),
      dueDate: isoDate(31),
      deliveryChannel: "portal",
      notes: "Quarterly machining consumables subscription.",
      lines: lineItemsForInvoice([
        { description: "Cutting fluid concentrate", quantity: 22, unitPrice: 380, taxRate: 6.5 },
        { description: "Carbide insert packs", quantity: 12, unitPrice: 470, taxRate: 6.5 },
      ]),
    },
    {
      key: "INV-260314-006",
      customerName: "Greenfield Facilities Management",
      status: "disputed",
      issueDate: isoDate(-41),
      dueDate: isoDate(-11),
      deliveryChannel: "postal",
      notes: "Janitorial equipment replacement for municipal contracts.",
      lines: lineItemsForInvoice([
        { description: "Industrial floor scrubbers", quantity: 4, unitPrice: 4200, taxRate: 5.6 },
        { description: "Replacement battery banks", quantity: 8, unitPrice: 720, taxRate: 5.6 },
      ]),
    },
    {
      key: "INV-260314-007",
      customerName: "Polaris Data Centers",
      status: "paid",
      issueDate: isoDate(-44),
      dueDate: isoDate(-29),
      deliveryChannel: "email",
      notes: "Cooling system parts for Northern Virginia expansion pods.",
      lines: lineItemsForInvoice([
        { description: "Cooling manifold assemblies", quantity: 10, unitPrice: 4200, taxRate: 6 },
        { description: "Sensor calibration kits", quantity: 16, unitPrice: 650, taxRate: 6 },
      ]),
    },
    {
      key: "INV-260314-008",
      customerName: "Westgate Food Distribution",
      status: "sent",
      issueDate: isoDate(-4),
      dueDate: isoDate(21),
      deliveryChannel: "sms",
      notes: "Warehouse conveyor and packaging line replacements.",
      lines: lineItemsForInvoice([
        { description: "Conveyor roller assemblies", quantity: 34, unitPrice: 510, taxRate: 7.75 },
        { description: "Packaging line sensors", quantity: 20, unitPrice: 390, taxRate: 7.75 },
      ]),
    },
    {
      key: "INV-260314-009",
      customerName: "Meridian Medical Group",
      status: "draft",
      issueDate: isoDate(0),
      dueDate: isoDate(30),
      deliveryChannel: null,
      notes: "Draft invoice for April expansion supplies awaiting approval.",
      lines: lineItemsForInvoice([
        { description: "Exam table paper rolls", quantity: 240, unitPrice: 22, taxRate: 8.25 },
        { description: "Sanitizer station refill packs", quantity: 90, unitPrice: 31, taxRate: 8.25 },
      ]),
    },
    {
      key: "INV-260314-010",
      customerName: "Atlas Freight Services",
      status: "overdue",
      issueDate: isoDate(-62),
      dueDate: isoDate(-32),
      deliveryChannel: "portal",
      notes: "Dock equipment safety replacement order.",
      lines: lineItemsForInvoice([
        { description: "Dock leveler repair kits", quantity: 14, unitPrice: 980, taxRate: 7.5 },
        { description: "Wheel chock packs", quantity: 40, unitPrice: 88, taxRate: 7.5 },
      ]),
    },
  ];

  const invoiceInserts = invoiceBlueprints.map((invoice) => {
    const totalAmount = Number(invoice.lines.total.toFixed(2));
    let balanceDue = totalAmount;
    if (invoice.key === "INV-260314-002") balanceDue = 0;
    if (invoice.key === "INV-260314-003") balanceDue = Number((totalAmount - 30000).toFixed(2));
    if (invoice.key === "INV-260314-007") balanceDue = 0;

    return {
      company_id: companyId,
      customer_id: customerMap[invoice.customerName],
      invoice_number: invoice.key,
      status: invoice.status,
      issue_date: invoice.issueDate,
      due_date: invoice.dueDate,
      subtotal: Number(invoice.lines.subtotal.toFixed(2)),
      tax_total: Number(invoice.lines.taxTotal.toFixed(2)),
      total_amount: totalAmount,
      balance_due: balanceDue,
      currency: DEMO_COMPANY.baseCurrency,
      delivery_channel: invoice.deliveryChannel,
      notes: invoice.notes,
      created_by: ownerId,
    };
  });

  const insertedInvoices = await expectNoError(
    await supabase.from("invoices").insert(invoiceInserts).select("id, invoice_number"),
    "Could not insert invoices",
  );

  const invoiceMap = Object.fromEntries(insertedInvoices.map((row) => [row.invoice_number, row.id]));

  const lineItems = invoiceBlueprints.flatMap((invoice) =>
    invoice.lines.items.map((item, index) => ({
      invoice_id: invoiceMap[invoice.key],
      description: item.description,
      quantity: item.quantity,
      unit_price: item.unitPrice,
      tax_rate: item.taxRate,
      line_total: Number((item.quantity * item.unitPrice * (1 + item.taxRate / 100)).toFixed(2)),
      sort_order: index,
    })),
  );

  await expectNoError(
    await supabase.from("invoice_line_items").insert(lineItems),
    "Could not insert invoice line items",
  );

  const deliveries = [
    {
      invoice: "INV-260314-001",
      customer: "Meridian Medical Group",
      channel: "email",
      status: "delivered",
      recipient: "ap@meridian-medical.com",
      tracking_ref: "SG-001",
      scheduled_for: addDays(-9, 15),
      sent_at: addDays(-9, 15),
      delivered_at: addDays(-9, 15),
    },
    {
      invoice: "INV-260314-002",
      customer: "Atlas Freight Services",
      channel: "portal",
      status: "confirmed",
      recipient: "finance@atlasfreight.com",
      tracking_ref: "PORTAL-002",
      scheduled_for: addDays(-33, 13),
      sent_at: addDays(-33, 13),
      delivered_at: addDays(-33, 13),
      confirmed_at: addDays(-32, 9),
    },
    {
      invoice: "INV-260314-003",
      customer: "BluePeak Retail Holdings",
      channel: "email",
      status: "delivered",
      recipient: "controller@bluepeakretail.com",
      tracking_ref: "SG-003",
      scheduled_for: addDays(-25, 16),
      sent_at: addDays(-25, 16),
      delivered_at: addDays(-25, 16),
    },
    {
      invoice: "INV-260314-004",
      customer: "Harborline Hotels",
      channel: "email",
      status: "delivered",
      recipient: "payables@harborlinehotels.com",
      tracking_ref: "SG-004",
      scheduled_for: addDays(-53, 12),
      sent_at: addDays(-53, 12),
      delivered_at: addDays(-53, 12),
    },
    {
      invoice: "INV-260314-005",
      customer: "Summit Precision Parts",
      channel: "portal",
      status: "queued",
      recipient: "ap@summitprecision.com",
      tracking_ref: "PORTAL-005",
      scheduled_for: addDays(1, 8),
    },
    {
      invoice: "INV-260314-006",
      customer: "Greenfield Facilities Management",
      channel: "postal",
      status: "sent",
      recipient: "finance@greenfieldfm.com",
      tracking_ref: "USPS-006",
      scheduled_for: addDays(-40, 14),
      sent_at: addDays(-40, 14),
    },
    {
      invoice: "INV-260314-007",
      customer: "Polaris Data Centers",
      channel: "email",
      status: "confirmed",
      recipient: "billing@polarisdc.com",
      tracking_ref: "SG-007",
      scheduled_for: addDays(-44, 17),
      sent_at: addDays(-44, 17),
      delivered_at: addDays(-44, 17),
      confirmed_at: addDays(-43, 11),
    },
    {
      invoice: "INV-260314-008",
      customer: "Westgate Food Distribution",
      channel: "sms",
      status: "delivered",
      recipient: "payables@westgatefoods.com",
      tracking_ref: "TWILIO-008",
      scheduled_for: addDays(-4, 18),
      sent_at: addDays(-4, 18),
      delivered_at: addDays(-4, 18),
    },
    {
      invoice: "INV-260314-010",
      customer: "Atlas Freight Services",
      channel: "portal",
      status: "confirmed",
      recipient: "finance@atlasfreight.com",
      tracking_ref: "PORTAL-010",
      scheduled_for: addDays(-62, 14),
      sent_at: addDays(-62, 14),
      delivered_at: addDays(-62, 14),
      confirmed_at: addDays(-61, 10),
    },
  ].map(({ invoice, customer, ...delivery }) => ({
    company_id: companyId,
    invoice_id: invoiceMap[invoice],
    customer_id: customerMap[customer],
    ...delivery,
    created_by: ownerId,
  }));

  if (capabilities.availableTables.has("invoice_deliveries")) {
    await expectNoError(
      await supabase.from("invoice_deliveries").insert(deliveries),
      "Could not insert invoice deliveries",
    );
  }

  const payments = [
    {
      customer: "Atlas Freight Services",
      invoice: "INV-260314-002",
      amount: 19092,
      status: "settled",
      channel: "ach",
      external_ref: "PMT-240201",
      received_at: addDays(-9, 14),
      metadata: { gateway: "Stripe US Merchant", batch: "ach-8401" },
    },
    {
      customer: "BluePeak Retail Holdings",
      invoice: "INV-260314-003",
      amount: 30000,
      status: "settled",
      channel: "wire",
      external_ref: "PMT-240203",
      received_at: addDays(-12, 16),
      metadata: { gateway: "Treasury Wire Desk", ticket: "wire-8820" },
    },
    {
      customer: "Polaris Data Centers",
      invoice: "INV-260314-007",
      amount: 55544,
      status: "settled",
      channel: "wire",
      external_ref: "PMT-240205",
      received_at: addDays(-30, 15),
      metadata: { gateway: "Treasury Wire Desk", ticket: "wire-9012" },
    },
    {
      customer: "Meridian Medical Group",
      invoice: "INV-260314-001",
      amount: 5000,
      status: "pending",
      channel: "card",
      external_ref: "PMT-240208",
      received_at: addDays(-1, 17),
      metadata: { gateway: "Stripe US Merchant", intent: "pi_90210" },
    },
    {
      customer: "Westgate Food Distribution",
      invoice: "INV-260314-008",
      amount: 27624.72,
      status: "failed",
      channel: "wallet",
      external_ref: "PMT-240209",
      received_at: addDays(-1, 13),
      metadata: { gateway: "Stripe US Merchant", failure_code: "insufficient_funds" },
    },
    {
      customer: "Greenfield Facilities Management",
      invoice: "INV-260314-006",
      amount: 1200,
      status: "refunded",
      channel: "card",
      external_ref: "PMT-240210",
      received_at: addDays(-22, 11),
      metadata: { gateway: "Stripe US Merchant", refund_reason: "duplicate charge claim" },
    },
  ].map(({ customer, invoice, ...payment }) => ({
    company_id: companyId,
    customer_id: customerMap[customer],
    invoice_id: invoiceMap[invoice],
    ...payment,
  }));

  await expectNoError(
    await supabase.from("payments").insert(payments),
    "Could not insert payments",
  );

  const reminders = [
    {
      invoice: "INV-260314-001",
      customer: "Meridian Medical Group",
      stage: "5 days before due date",
      channel: "email",
      status: "queued",
      scheduled_for: addDays(16, 8),
    },
    {
      invoice: "INV-260314-003",
      customer: "BluePeak Retail Holdings",
      stage: "Partial payment follow-up",
      channel: "email",
      status: "sent",
      scheduled_for: addDays(-1, 10),
      sent_at: addDays(-1, 10),
    },
    {
      invoice: "INV-260314-004",
      customer: "Harborline Hotels",
      stage: "15 days overdue",
      channel: "sms",
      status: "sent",
      scheduled_for: addDays(-2, 9),
      sent_at: addDays(-2, 9),
    },
    {
      invoice: "INV-260314-004",
      customer: "Harborline Hotels",
      stage: "Collections call task",
      channel: "call_task",
      status: "escalated",
      scheduled_for: addDays(1, 11),
    },
    {
      invoice: "INV-260314-006",
      customer: "Greenfield Facilities Management",
      stage: "Dispute follow-up",
      channel: "email",
      status: "queued",
      scheduled_for: addDays(2, 13),
    },
    {
      invoice: "INV-260314-010",
      customer: "Atlas Freight Services",
      stage: "30 days overdue",
      channel: "call_task",
      status: "escalated",
      scheduled_for: addDays(0, 15),
    },
  ].map(({ invoice, customer, ...reminder }) => ({
    company_id: companyId,
    invoice_id: invoiceMap[invoice],
    customer_id: customerMap[customer],
    ...reminder,
  }));

  await expectNoError(
    await supabase.from("reminders").insert(reminders),
    "Could not insert reminders",
  );

  if (capabilities.availableTables.has("reminder_policies")) {
    const reminderPolicies = [
      {
        company_id: companyId,
        name: "Pre-due email nudge",
        trigger_type: "before_due",
        days_offset: 5,
        stage: "5 days before due date",
        channel: "email",
        is_active: true,
        created_by: ownerId,
      },
      {
        company_id: companyId,
        name: "Post-due SMS escalation",
        trigger_type: "after_due",
        days_offset: 3,
        stage: "3 days overdue",
        channel: "sms",
        is_active: true,
        created_by: ownerId,
      },
      {
        company_id: companyId,
        name: "Collector call task",
        trigger_type: "after_due",
        days_offset: 10,
        stage: "10 days overdue escalation",
        channel: "call_task",
        is_active: true,
        created_by: ownerId,
      },
    ];

    await expectNoError(
      await supabase.from("reminder_policies").insert(reminderPolicies),
      "Could not insert reminder policies",
    );
    reminderPolicyCount = reminderPolicies.length;
  }

  const disputes = [
    {
      company_id: companyId,
      invoice_id: invoiceMap["INV-260314-006"],
      customer_id: customerMap["Greenfield Facilities Management"],
      title: "Freight charge discrepancy",
      description: "Customer disputes the outbound freight surcharge and asked for supporting bill of lading.",
      status: "open",
      opened_by: ownerId,
      opened_at: addDays(-10, 14),
    },
  ];

  const insertedDisputes = await expectNoError(
    await supabase.from("disputes").insert(disputes).select("id, title"),
    "Could not insert disputes",
  );

  const disputeMap = Object.fromEntries(insertedDisputes.map((row) => [row.title, row.id]));

  const templates = [
    {
      company_id: companyId,
      name: "Standard Enterprise Invoice",
      description: "Default branded invoice used for contract and replenishment billing.",
      delivery_channel: "email",
      payment_terms_days: 30,
      accent_color: "#2f6fed",
      footer_text: "Questions? Contact ar@ridgewayindustrial.com",
      is_default: true,
      created_by: ownerId,
    },
    {
      company_id: companyId,
      name: "Portal Self-Service Invoice",
      description: "Optimized for portal delivery and online payment collection.",
      delivery_channel: "portal",
      payment_terms_days: 15,
      accent_color: "#2c9a69",
      footer_text: "Payments can be completed online through the customer portal.",
      is_default: false,
      created_by: ownerId,
    },
    {
      company_id: companyId,
      name: "Collections Escalation Notice",
      description: "Used by collectors when invoices move into overdue follow-up.",
      delivery_channel: "email",
      payment_terms_days: 7,
      accent_color: "#df6a67",
      footer_text: "Please contact collections@ridgewayindustrial.com immediately.",
      is_default: false,
      created_by: ownerId,
    },
  ];

  let insertedTemplates = [];
  if (capabilities.availableTables.has("invoice_templates")) {
    insertedTemplates = await expectNoError(
      await supabase
        .from("invoice_templates")
        .insert(templates)
        .select("id, name"),
      "Could not insert invoice templates",
    );
  }

  if (capabilities.availableTables.has("invoice_automations")) {
    const templateMap = new Map(insertedTemplates.map((template) => [template.name, template.id]));
    const invoiceAutomations = [
      {
        company_id: companyId,
        customer_id: customerMap["Meridian Medical Group"],
        template_id: templateMap.get("Standard Enterprise Invoice") ?? null,
        name: "Meridian monthly supply invoice",
        automation_mode: "recurring",
        cadence_days: 30,
        next_run_date: isoDate(3),
        auto_send: true,
        delivery_channel: "email",
        default_notes: "Auto-generated monthly replenishment invoice.",
        line_items: [
          { description: "Monthly sterile supply bundle", quantity: 1, unitPrice: 18500, taxRate: 8.25 },
          { description: "Distribution handling", quantity: 1, unitPrice: 650, taxRate: 8.25 },
        ],
        is_active: true,
        created_by: ownerId,
      },
      {
        company_id: companyId,
        customer_id: customerMap["Summit Precision Parts"],
        template_id: templateMap.get("Portal Self-Service Invoice") ?? null,
        name: "Summit contract billing",
        automation_mode: "contract",
        cadence_days: 30,
        next_run_date: isoDate(10),
        auto_send: true,
        delivery_channel: "portal",
        default_notes: "Contract milestone auto-billing run.",
        line_items: [
          { description: "CNC consumables block", quantity: 1, unitPrice: 9400, taxRate: 6.5 },
        ],
        is_active: true,
        created_by: ownerId,
      },
    ];

    await expectNoError(
      await supabase.from("invoice_automations").insert(invoiceAutomations),
      "Could not insert invoice automations",
    );
    automationCount = invoiceAutomations.length;
  }

  const integrations = [
    {
      company_id: companyId,
      name: "NetSuite AR Sync",
      provider: "NetSuite",
      category: "erp",
      status: "healthy",
      health_note: "Bidirectional sync for customers, invoices, and payment status is operating within SLA.",
      webhook_url: null,
      last_sync_at: addDays(0, 8),
      config: { direction: "bi-directional", entities: ["customers", "invoices", "payments"] },
      created_by: ownerId,
    },
    {
      company_id: companyId,
      name: "Stripe Event Stream",
      provider: "Stripe",
      category: "payments",
      status: "healthy",
      health_note: "Card and ACH events are landing in real time for settlement and failures.",
      webhook_url: "https://ridgewaydemo.example/webhooks/stripe",
      last_sync_at: addDays(0, 9),
      config: { events: ["payment_intent.succeeded", "charge.failed", "charge.refunded"] },
      created_by: ownerId,
    },
    {
      company_id: companyId,
      name: "Twilio Reminder Delivery",
      provider: "Twilio",
      category: "communications",
      status: "review",
      health_note: "SMS delivery is healthy but reply handling is still under review.",
      webhook_url: "https://ridgewaydemo.example/webhooks/twilio",
      last_sync_at: addDays(-1, 20),
      config: { messages: "reminders and confirmations" },
      created_by: ownerId,
    },
    {
      company_id: companyId,
      name: "SFTP Month-End Export",
      provider: "SFTP",
      category: "webhook",
      status: "lagging",
      health_note: "Month-end accounting export missed the last retry window and needs operator review.",
      webhook_url: null,
      last_sync_at: addDays(-2, 4),
      config: { destination: "finance-data-lake", cadence: "monthly" },
      created_by: ownerId,
    },
  ];

  let insertedIntegrations = [];
  if (capabilities.availableTables.has("integration_connections")) {
    insertedIntegrations = await expectNoError(
      await supabase
        .from("integration_connections")
        .insert(integrations)
        .select("id, name"),
      "Could not insert integration connections",
    );
  }

  if (capabilities.availableTables.has("integration_sync_runs") && insertedIntegrations.length) {
    const integrationMap = new Map(insertedIntegrations.map((integration) => [integration.name, integration.id]));
    const syncRuns = [
      {
        company_id: companyId,
        integration_id: integrationMap.get("NetSuite AR Sync"),
        direction: "bi_directional",
        status: "succeeded",
        summary: {
          invoices_processed: 10,
          customers_processed: 8,
          payments_processed: 6,
        },
        started_at: addDays(-1, 6),
        finished_at: addDays(-1, 6, 7),
        triggered_by: ownerId,
      },
      {
        company_id: companyId,
        integration_id: integrationMap.get("Stripe Event Stream"),
        direction: "push",
        status: "succeeded",
        summary: {
          payment_events: 12,
          failed_events: 1,
        },
        started_at: addDays(0, 8),
        finished_at: addDays(0, 8, 2),
        triggered_by: ownerId,
      },
      {
        company_id: companyId,
        integration_id: integrationMap.get("SFTP Month-End Export"),
        direction: "push",
        status: "failed",
        summary: {
          error: "Remote SFTP endpoint timeout",
          retries: 2,
        },
        started_at: addDays(-2, 4),
        finished_at: addDays(-2, 4, 5),
        triggered_by: ownerId,
      },
    ].filter((run) => run.integration_id);

    if (syncRuns.length) {
      await expectNoError(
        await supabase.from("integration_sync_runs").insert(syncRuns),
        "Could not insert integration sync runs",
      );
      syncRunCount = syncRuns.length;
    }
  }

  const gateways = [
    {
      company_id: companyId,
      account_label: "Stripe US Merchant",
      provider: "Stripe",
      status: "live",
      supported_channels: ["card", "ach", "wallet"],
      checkout_url: "https://pay.ridgewaydemo.example/checkout",
      webhook_status: "healthy",
      settlement_days: 2,
      merchant_ref: "acct_stripe_us_live_01",
      last_event_at: addDays(0, 9),
      created_by: ownerId,
    },
    {
      company_id: companyId,
      account_label: "Treasury Wire Desk",
      provider: "JPMorgan Treasury",
      status: "configured",
      supported_channels: ["wire"],
      checkout_url: null,
      webhook_status: "not_required",
      settlement_days: 1,
      merchant_ref: "wire_ops_primary",
      last_event_at: addDays(-1, 15),
      created_by: ownerId,
    },
  ];

  if (capabilities.availableTables.has("payment_gateway_accounts")) {
    await expectNoError(
      await supabase.from("payment_gateway_accounts").insert(gateways),
      "Could not insert payment gateway accounts",
    );
  }

  const snapshots = [
    {
      company_id: companyId,
      snapshot_name: "nightly-prod-2026-03-14",
      scope: "postgres + storage metadata",
      backup_kind: "nightly",
      status: "verified",
      storage_ref: "s3://ridgeway-backups/nightly-prod-2026-03-14.dump",
      notes: "Verified restore into staging before business hours.",
      expires_at: addDays(30, 2),
      restore_tested_at: addDays(-1, 5),
      created_by: ownerId,
    },
    {
      company_id: companyId,
      snapshot_name: "pre-month-end-close-2026-02-28",
      scope: "postgres full backup",
      backup_kind: "manual",
      status: "completed",
      storage_ref: "s3://ridgeway-backups/pre-month-end-close-2026-02-28.dump",
      notes: "Manual checkpoint created before month-end posting.",
      expires_at: addDays(14, 3),
      restore_tested_at: null,
      created_by: ownerId,
    },
    {
      company_id: companyId,
      snapshot_name: "compliance-retention-2026-q1",
      scope: "audit records + control evidence",
      backup_kind: "compliance",
      status: "completed",
      storage_ref: "s3://ridgeway-backups/compliance-q1-2026.tar.gz",
      notes: "Quarterly evidence pack retained for SOC 2 review.",
      expires_at: addDays(90, 4),
      restore_tested_at: null,
      created_by: ownerId,
    },
  ];

  if (capabilities.availableTables.has("recovery_snapshots")) {
    await expectNoError(
      await supabase.from("recovery_snapshots").insert(snapshots),
      "Could not insert recovery snapshots",
    );
  }

  const controls = [
    {
      company_id: companyId,
      category: "Access",
      control_name: "Role-based workspace access review",
      framework: "SOC 2",
      status: "implemented",
      owner: DEMO_OWNER.fullName,
      last_reviewed_at: addDays(-4, 14),
      next_review_due: addDays(26, 14),
      notes: "Owner reviews privileged roles monthly.",
      created_by: ownerId,
    },
    {
      company_id: companyId,
      category: "Payments",
      control_name: "Gateway webhook signature verification",
      framework: "PCI DSS",
      status: "monitoring",
      owner: "Payments platform team",
      last_reviewed_at: addDays(-2, 16),
      next_review_due: addDays(28, 16),
      notes: "Stripe signatures verified before settlement records are accepted.",
      created_by: ownerId,
    },
    {
      company_id: companyId,
      category: "Recovery",
      control_name: "Quarterly restore drill",
      framework: "SOC 2",
      status: "planned",
      owner: "Infrastructure operations",
      last_reviewed_at: null,
      next_review_due: addDays(21, 10),
      notes: "Next drill will validate portal tokens, customer balances, and delivery history after restore.",
      created_by: ownerId,
    },
    {
      company_id: companyId,
      category: "Audit",
      control_name: "AR activity log review",
      framework: "Internal",
      status: "implemented",
      owner: "Finance operations",
      last_reviewed_at: addDays(-1, 18),
      next_review_due: addDays(6, 18),
      notes: "Audit logs reviewed weekly for privileged actions and disputed invoice edits.",
      created_by: ownerId,
    },
  ];

  if (capabilities.availableTables.has("security_controls")) {
    await expectNoError(
      await supabase.from("security_controls").insert(controls),
      "Could not insert security controls",
    );
  }

  if (capabilities.availableTables.has("credit_alerts")) {
    const creditAlerts = [
      {
        company_id: companyId,
        customer_id: customerMap["Harborline Hotels"],
        severity: "critical",
        reason: "Over credit limit",
        status: "open",
        details: {
          customer_name: "Harborline Hotels",
          open_balance: 25861.3,
          credit_limit: 110000,
          overdue_balance: 25861.3,
          overdue_invoices: 1,
        },
        created_by: ownerId,
      },
      {
        company_id: companyId,
        customer_id: customerMap["Atlas Freight Services"],
        severity: "warning",
        reason: "Overdue receivables exposure",
        status: "open",
        details: {
          customer_name: "Atlas Freight Services",
          open_balance: 18343.5,
          credit_limit: 95000,
          overdue_balance: 18343.5,
          overdue_invoices: 1,
        },
        created_by: ownerId,
      },
    ];

    await expectNoError(
      await supabase.from("credit_alerts").insert(creditAlerts),
      "Could not insert credit alerts",
    );
    creditAlertCount = creditAlerts.length;
  }

  const documents = [
    {
      company_id: companyId,
      customer_id: customerMap["Meridian Medical Group"],
      invoice_id: invoiceMap["INV-260314-001"],
      kind: "invoice_pdf",
      bucket_path: "ridgeway-industrial-supply/invoices/INV-260314-001.pdf",
      uploaded_by: ownerId,
    },
    {
      company_id: companyId,
      customer_id: customerMap["Atlas Freight Services"],
      invoice_id: invoiceMap["INV-260314-002"],
      kind: "invoice_pdf",
      bucket_path: "ridgeway-industrial-supply/invoices/INV-260314-002.pdf",
      uploaded_by: ownerId,
    },
    {
      company_id: companyId,
      customer_id: customerMap["Greenfield Facilities Management"],
      invoice_id: invoiceMap["INV-260314-006"],
      kind: "proof",
      bucket_path: "ridgeway-industrial-supply/proofs/greenfield-bol-260314.pdf",
      uploaded_by: ownerId,
    },
    {
      company_id: companyId,
      customer_id: customerMap["Greenfield Facilities Management"],
      invoice_id: invoiceMap["INV-260314-006"],
      dispute_id: disputeMap["Freight charge discrepancy"],
      kind: "dispute_attachment",
      bucket_path: "ridgeway-industrial-supply/disputes/greenfield-freight-dispute-email.pdf",
      uploaded_by: ownerId,
    },
    {
      company_id: companyId,
      customer_id: customerMap["BluePeak Retail Holdings"],
      kind: "contract",
      bucket_path: "ridgeway-industrial-supply/contracts/bluepeak-master-supply-agreement.pdf",
      uploaded_by: ownerId,
    },
    {
      company_id: companyId,
      customer_id: customerMap["Polaris Data Centers"],
      invoice_id: invoiceMap["INV-260314-007"],
      kind: "proof",
      bucket_path: "ridgeway-industrial-supply/proofs/polaris-receiving-confirmation.pdf",
      uploaded_by: ownerId,
    },
  ];

  await expectNoError(
    await supabase.from("documents").insert(documents),
    "Could not insert documents",
  );

  const auditLogs = [
    {
      company_id: companyId,
      actor_id: ownerId,
      entity_type: "company",
      entity_id: companyId,
      action: "seed.reset",
      details: {
        message: "Realistic demo dataset refreshed",
        owner_email: DEMO_OWNER.email,
      },
      created_at: addDays(-2, 7),
    },
    {
      company_id: companyId,
      actor_id: ownerId,
      entity_type: "gateway",
      entity_id: null,
      action: "gateway.activated",
      details: {
        provider: "Stripe",
        account_label: "Stripe US Merchant",
      },
      created_at: addDays(-2, 8),
    },
    {
      company_id: companyId,
      actor_id: ownerId,
      entity_type: "invoice",
      entity_id: invoiceMap["INV-260314-003"],
      action: "invoice.sent",
      details: {
        invoice_number: "INV-260314-003",
        channel: "email",
        customer: "BluePeak Retail Holdings",
      },
      created_at: addDays(-25, 16),
    },
    {
      company_id: companyId,
      actor_id: ownerId,
      entity_type: "payment",
      entity_id: null,
      action: "payment.settled",
      details: {
        invoice_number: "INV-260314-002",
        amount: 19149,
        channel: "ach",
      },
      created_at: addDays(-9, 14),
    },
    {
      company_id: companyId,
      actor_id: ownerId,
      entity_type: "reminder",
      entity_id: null,
      action: "reminder.escalated",
      details: {
        invoice_number: "INV-260314-010",
        stage: "30 days overdue",
      },
      created_at: addDays(0, 15),
    },
    {
      company_id: companyId,
      actor_id: ownerId,
      entity_type: "dispute",
      entity_id: disputeMap["Freight charge discrepancy"],
      action: "dispute.opened",
      details: {
        invoice_number: "INV-260314-006",
        customer: "Greenfield Facilities Management",
      },
      created_at: addDays(-10, 14),
    },
    {
      company_id: companyId,
      actor_id: ownerId,
      entity_type: "recovery",
      entity_id: null,
      action: "snapshot.verified",
      details: {
        snapshot_name: "nightly-prod-2026-03-14",
      },
      created_at: addDays(-1, 5),
    },
    {
      company_id: companyId,
      actor_id: ownerId,
      entity_type: "compliance",
      entity_id: null,
      action: "control.reviewed",
      details: {
        control_name: "AR activity log review",
        framework: "Internal",
      },
      created_at: addDays(-1, 18),
    },
  ];

  await expectNoError(
    await supabase.from("audit_logs").insert(auditLogs),
    "Could not insert audit logs",
  );

  return {
    customerCount: customers.length,
    invoiceCount: invoiceBlueprints.length,
    paymentCount: payments.length,
    reminderCount: reminders.length,
    deliveryCount: capabilities.availableTables.has("invoice_deliveries") ? deliveries.length : 0,
    disputeCount: disputes.length,
    documentCount: documents.length,
    automationCount,
    reminderPolicyCount,
    creditAlertCount,
    syncRunCount,
  };
}

async function main() {
  console.log("Starting realistic demo seed...");
  const capabilities = await inspectSchemaCapabilities();
  if (capabilities.missingOptionalTables.length > 0) {
    console.log(
      `Warning: optional module tables missing, continuing with partial seed: ${capabilities.missingOptionalTables.join(", ")}`,
    );
    console.log(buildMigrationHintMessage());
  }
  const owner = await findOrCreateOwner();
  const companyId = await findOrCreateCompany(owner.id);
  await clearCompanyData(companyId, capabilities);
  await ensureOwnerMembership(companyId, owner.id);
  const counts = await seedCompany(companyId, owner.id, capabilities);

  console.log("");
  console.log("Realistic demo dataset is ready.");
  console.log(`Owner email: ${DEMO_OWNER.email}`);
  console.log(`Owner password: ${DEMO_OWNER.password}`);
  console.log(`Company: ${DEMO_COMPANY.name}`);
  console.log(`Workspace slug: ${DEMO_COMPANY.slug}`);
  console.log(
    `Seeded ${counts.customerCount} customers, ${counts.invoiceCount} invoices, ${counts.paymentCount} payments, ${counts.reminderCount} reminders, ${counts.deliveryCount} deliveries, ${counts.disputeCount} disputes, ${counts.documentCount} documents, ${counts.automationCount} invoice automations, ${counts.reminderPolicyCount} reminder policies, ${counts.creditAlertCount} credit alerts, and ${counts.syncRunCount} sync runs.`,
  );
}

main().catch((error) => {
  console.error("");
  console.error("Realistic demo seed failed.");
  console.error(error.message);
  process.exitCode = 1;
});
