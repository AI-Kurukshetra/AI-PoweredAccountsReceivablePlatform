export type InvoiceStatus =
  | "Draft"
  | "Scheduled"
  | "Sent"
  | "Partial"
  | "Overdue"
  | "Paid"
  | "Disputed";

export type PaymentChannel = "Card" | "ACH" | "Wire" | "Wallet";

export interface SummaryMetric {
  label: string;
  value: string;
  change: string;
  tone: "brand" | "accent" | "success" | "danger";
}

export interface CustomerAccount {
  id: string;
  name: string;
  segment: string;
  owner: string;
  creditLimit: number;
  openBalance: number;
  risk: "Low" | "Medium" | "High";
  paymentTerms: string;
  lastInvoiceDate: string;
}

export interface InvoiceRecord {
  id: string;
  customer: string;
  amount: number;
  dueDate: string;
  issuedDate: string;
  status: InvoiceStatus;
  channel: "Email" | "Portal" | "API Sync";
  owner: string;
}

export interface PaymentRecord {
  id: string;
  customer: string;
  amount: number;
  channel: PaymentChannel;
  receivedAt: string;
  invoiceId: string;
  status: "Settled" | "Pending" | "Failed";
}

export interface ReminderFlow {
  customer: string;
  stage: string;
  nextTouch: string;
  channel: "Email" | "SMS" | "Call task";
  status: "Queued" | "Sent" | "Escalated";
}

export interface CashForecastPoint {
  week: string;
  committed: number;
  likely: number;
}

export interface ActivityEvent {
  id: string;
  title: string;
  detail: string;
  time: string;
  category: "invoice" | "payment" | "dispute" | "integration";
}

export interface IntegrationStatus {
  name: string;
  description: string;
  status: "Healthy" | "Lagging" | "Review";
  syncLag: string;
}
