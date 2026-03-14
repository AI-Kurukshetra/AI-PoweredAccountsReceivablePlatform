import { getMembershipContext } from "@/lib/company";
import { createClient } from "@/lib/supabase/server";

type CustomerRow = {
  id: string;
  name: string;
  email: string | null;
  segment: string | null;
  external_ref: string | null;
  payment_terms_days: number;
  credit_limit: number;
  metadata: Record<string, string> | null;
  created_at: string;
};

type InvoiceRow = {
  id: string;
  invoice_number: string;
  status: string;
  total_amount: number;
  balance_due: number;
  issue_date: string;
  due_date: string;
  delivery_channel: string | null;
  created_at: string;
  customer: { name: string } | null;
};

type PaymentRow = {
  id: string;
  amount: number;
  channel: string;
  status: string;
  received_at: string | null;
  external_ref: string | null;
  customer: { name: string } | null;
  invoice: { invoice_number: string } | null;
};

type ReminderRow = {
  id: string;
  stage: string;
  channel: string;
  status: string;
  scheduled_for: string;
  customer: { name: string } | null;
  invoice: { invoice_number: string } | null;
};

type DisputeRow = {
  id: string;
  title: string;
  status: string;
  description: string | null;
  opened_at: string;
  customer: { name: string } | null;
  invoice: { invoice_number: string } | null;
};

type AuditRow = {
  id: string;
  action: string;
  entity_type: string;
  created_at: string;
  details: Record<string, string> | null;
};

function formatCompactCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

function formatRelativeLabel(dateString: string | null) {
  if (!dateString) {
    return "Not received";
  }

  const value = new Date(dateString);
  return value.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function normalizeRelation<T>(value: T | T[] | null): T | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

function averageIssueToDueDays(invoices: Pick<InvoiceRow, "issue_date" | "due_date">[]) {
  if (!invoices.length) {
    return 0;
  }

  const totalDays = invoices.reduce((sum, invoice) => {
    const issue = new Date(invoice.issue_date).getTime();
    const due = new Date(invoice.due_date).getTime();
    return sum + Math.max(0, Math.round((due - issue) / 86400000));
  }, 0);

  return Math.round(totalDays / invoices.length);
}

export async function getWorkspaceSnapshot() {
  const membership = await getMembershipContext();

  if (!membership) {
    return null;
  }

  const supabase = await createClient();
  const companyId = membership.companyId;

  const [customersResult, invoicesResult, paymentsResult, remindersResult, disputesResult, auditResult] =
    await Promise.all([
      supabase
        .from("customers")
        .select("id, name, email, segment, external_ref, payment_terms_days, credit_limit, metadata, created_at")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false }),
      supabase
        .from("invoices")
        .select(
          `
            id,
            invoice_number,
            status,
            total_amount,
            balance_due,
            issue_date,
            due_date,
            delivery_channel,
            created_at,
            customer:customers(name)
          `,
        )
        .eq("company_id", companyId)
        .order("due_date", { ascending: true }),
      supabase
        .from("payments")
        .select(
          `
            id,
            amount,
            channel,
            status,
            received_at,
            external_ref,
            customer:customers(name),
            invoice:invoices(invoice_number)
          `,
        )
        .eq("company_id", companyId)
        .order("received_at", { ascending: false }),
      supabase
        .from("reminders")
        .select(
          `
            id,
            stage,
            channel,
            status,
            scheduled_for,
            customer:customers(name),
            invoice:invoices(invoice_number)
          `,
        )
        .eq("company_id", companyId)
        .order("scheduled_for", { ascending: true }),
      supabase
        .from("disputes")
        .select(
          `
            id,
            title,
            status,
            description,
            opened_at,
            customer:customers(name),
            invoice:invoices(invoice_number)
          `,
        )
        .eq("company_id", companyId)
        .order("opened_at", { ascending: false }),
      supabase
        .from("audit_logs")
        .select("id, action, entity_type, created_at, details")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false })
        .limit(6),
    ]);

  const customers = (customersResult.data ?? []) as CustomerRow[];
  const invoices: InvoiceRow[] = (invoicesResult.data ?? []).map((invoice) => ({
    ...invoice,
    customer: normalizeRelation(invoice.customer),
  })) as InvoiceRow[];
  const payments: PaymentRow[] = (paymentsResult.data ?? []).map((payment) => ({
    ...payment,
    customer: normalizeRelation(payment.customer),
    invoice: normalizeRelation(payment.invoice),
  })) as PaymentRow[];
  const reminders: ReminderRow[] = (remindersResult.data ?? []).map((reminder) => ({
    ...reminder,
    customer: normalizeRelation(reminder.customer),
    invoice: normalizeRelation(reminder.invoice),
  })) as ReminderRow[];
  const disputes: DisputeRow[] = (disputesResult.data ?? []).map((dispute) => ({
    ...dispute,
    customer: normalizeRelation(dispute.customer),
    invoice: normalizeRelation(dispute.invoice),
  })) as DisputeRow[];
  const auditLogs = (auditResult.data ?? []) as AuditRow[];

  const openReceivables = invoices.reduce(
    (sum, invoice) => sum + Number(invoice.balance_due ?? 0),
    0,
  );
  const overdueBalance = invoices
    .filter((invoice) => invoice.status === "overdue" || invoice.status === "disputed")
    .reduce((sum, invoice) => sum + Number(invoice.balance_due ?? 0), 0);
  const settledPayments = payments
    .filter((payment) => payment.status === "settled")
    .reduce((sum, payment) => sum + Number(payment.amount ?? 0), 0);
  const averageTerms = averageIssueToDueDays(invoices);

  return {
    membership,
    customers,
    invoices,
    payments,
    reminders,
    disputes,
    auditLogs,
    metrics: [
      {
        label: "Open receivables",
        value: formatCompactCurrency(openReceivables),
        change: `${invoices.length} invoices in workspace`,
        tone: "brand" as const,
      },
      {
        label: "Average terms",
        value: `${averageTerms} days`,
        change: `${customers.length} customers active`,
        tone: "success" as const,
      },
      {
        label: "Overdue balance",
        value: formatCompactCurrency(overdueBalance),
        change: `${disputes.length} disputes open`,
        tone: "danger" as const,
      },
      {
        label: "Settled payments",
        value: formatCompactCurrency(settledPayments),
        change: `${payments.length} receipts tracked`,
        tone: "accent" as const,
      },
    ],
    paymentConversion:
      invoices.length > 0
        ? Math.round(
            (payments.filter((payment) => payment.status === "settled").length /
              invoices.length) *
              100,
          )
        : 0,
    reminderCoverage:
      invoices.length > 0 ? Math.round((reminders.length / invoices.length) * 100) : 0,
    latestReceipt:
      payments.find((payment) => payment.received_at)?.received_at ?? null,
    formatRelativeLabel,
  };
}
