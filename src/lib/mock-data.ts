import type {
  ActivityEvent,
  CashForecastPoint,
  CustomerAccount,
  IntegrationStatus,
  InvoiceRecord,
  PaymentRecord,
  ReminderFlow,
  SummaryMetric,
} from "@/lib/types";

export const summaryMetrics: SummaryMetric[] = [
  { label: "Open receivables", value: "$1.82M", change: "+8.4% vs last month", tone: "brand" },
  { label: "DSO", value: "34 days", change: "-4 days improvement", tone: "success" },
  { label: "Overdue balance", value: "$312K", change: "11 accounts at risk", tone: "danger" },
  { label: "Cash likely in 14 days", value: "$640K", change: "73% confidence", tone: "accent" },
];

export const customers: CustomerAccount[] = [
  {
    id: "C-101",
    name: "Northstar Medical Supply",
    segment: "Enterprise",
    owner: "Aarav Shah",
    creditLimit: 350000,
    openBalance: 148200,
    risk: "Medium",
    paymentTerms: "Net 30",
    lastInvoiceDate: "Mar 09, 2026",
  },
  {
    id: "C-102",
    name: "Atlas Logistics Group",
    segment: "Mid-market",
    owner: "Neha Jain",
    creditLimit: 180000,
    openBalance: 68240,
    risk: "Low",
    paymentTerms: "Net 15",
    lastInvoiceDate: "Mar 12, 2026",
  },
  {
    id: "C-103",
    name: "BluePeak Retail Holdings",
    segment: "Strategic",
    owner: "Kabir Mehta",
    creditLimit: 420000,
    openBalance: 201600,
    risk: "High",
    paymentTerms: "Net 45",
    lastInvoiceDate: "Mar 02, 2026",
  },
  {
    id: "C-104",
    name: "Verde Hospitality",
    segment: "Growth",
    owner: "Aanya Rao",
    creditLimit: 120000,
    openBalance: 46250,
    risk: "Low",
    paymentTerms: "Net 30",
    lastInvoiceDate: "Mar 11, 2026",
  },
];

export const invoices: InvoiceRecord[] = [
  {
    id: "INV-2048",
    customer: "Northstar Medical Supply",
    amount: 92450,
    dueDate: "Mar 18, 2026",
    issuedDate: "Feb 18, 2026",
    status: "Partial",
    channel: "API Sync",
    owner: "Aarav Shah",
  },
  {
    id: "INV-2051",
    customer: "BluePeak Retail Holdings",
    amount: 118200,
    dueDate: "Mar 05, 2026",
    issuedDate: "Jan 20, 2026",
    status: "Overdue",
    channel: "Portal",
    owner: "Kabir Mehta",
  },
  {
    id: "INV-2053",
    customer: "Atlas Logistics Group",
    amount: 26540,
    dueDate: "Mar 20, 2026",
    issuedDate: "Mar 05, 2026",
    status: "Sent",
    channel: "Email",
    owner: "Neha Jain",
  },
  {
    id: "INV-2055",
    customer: "Verde Hospitality",
    amount: 40800,
    dueDate: "Mar 16, 2026",
    issuedDate: "Feb 29, 2026",
    status: "Disputed",
    channel: "Portal",
    owner: "Aanya Rao",
  },
  {
    id: "INV-2058",
    customer: "Northstar Medical Supply",
    amount: 54000,
    dueDate: "Apr 02, 2026",
    issuedDate: "Mar 14, 2026",
    status: "Scheduled",
    channel: "Email",
    owner: "Aarav Shah",
  },
];

export const payments: PaymentRecord[] = [
  {
    id: "PMT-901",
    customer: "Atlas Logistics Group",
    amount: 17250,
    channel: "ACH",
    receivedAt: "Mar 14, 2026 · 09:12",
    invoiceId: "INV-2049",
    status: "Settled",
  },
  {
    id: "PMT-902",
    customer: "Northstar Medical Supply",
    amount: 25000,
    channel: "Wire",
    receivedAt: "Mar 13, 2026 · 16:40",
    invoiceId: "INV-2048",
    status: "Pending",
  },
  {
    id: "PMT-903",
    customer: "Verde Hospitality",
    amount: 12400,
    channel: "Card",
    receivedAt: "Mar 13, 2026 · 11:06",
    invoiceId: "INV-2052",
    status: "Settled",
  },
  {
    id: "PMT-904",
    customer: "BluePeak Retail Holdings",
    amount: 18100,
    channel: "Wallet",
    receivedAt: "Mar 12, 2026 · 19:18",
    invoiceId: "INV-2039",
    status: "Failed",
  },
];

export const reminderFlows: ReminderFlow[] = [
  {
    customer: "BluePeak Retail Holdings",
    stage: "7 days overdue",
    nextTouch: "Mar 15 · 10:00",
    channel: "Call task",
    status: "Escalated",
  },
  {
    customer: "Northstar Medical Supply",
    stage: "Before due date",
    nextTouch: "Mar 16 · 08:30",
    channel: "Email",
    status: "Queued",
  },
  {
    customer: "Verde Hospitality",
    stage: "Dispute follow-up",
    nextTouch: "Mar 14 · 15:00",
    channel: "SMS",
    status: "Sent",
  },
];

export const cashForecast: CashForecastPoint[] = [
  { week: "W1", committed: 220000, likely: 88000 },
  { week: "W2", committed: 310000, likely: 114000 },
  { week: "W3", committed: 194000, likely: 92000 },
  { week: "W4", committed: 278000, likely: 126000 },
];

export const activities: ActivityEvent[] = [
  {
    id: "A-1",
    title: "ERP sync pushed 24 invoices",
    detail: "NetSuite import completed with no failed records.",
    time: "8 minutes ago",
    category: "integration",
  },
  {
    id: "A-2",
    title: "Payment dispute opened",
    detail: "Verde Hospitality challenged INV-2055 for duplicate line items.",
    time: "22 minutes ago",
    category: "dispute",
  },
  {
    id: "A-3",
    title: "Invoice reminder delivered",
    detail: "BluePeak follow-up sequence moved to collection stage 3.",
    time: "48 minutes ago",
    category: "invoice",
  },
  {
    id: "A-4",
    title: "ACH receipt matched",
    detail: "PMT-901 auto-reconciled against INV-2049.",
    time: "1 hour ago",
    category: "payment",
  },
];

export const integrationStatuses: IntegrationStatus[] = [
  {
    name: "NetSuite",
    description: "Invoice issue + customer sync",
    status: "Healthy",
    syncLag: "2 min lag",
  },
  {
    name: "Stripe",
    description: "Card settlement + retry events",
    status: "Healthy",
    syncLag: "Real-time",
  },
  {
    name: "Twilio",
    description: "SMS reminder delivery",
    status: "Review",
    syncLag: "6 min lag",
  },
  {
    name: "QuickBooks",
    description: "Fallback accounting export",
    status: "Lagging",
    syncLag: "39 min lag",
  },
];

export const productModules = [
  "Automated invoice generation and recurring schedules",
  "Multi-channel invoice delivery with confirmation tracking",
  "Payment gateway management for card, ACH, wire, and wallet rails",
  "Customer self-service portal for invoices and payment history",
  "Custom invoice templates and branded delivery defaults",
  "Document registry for contracts, proofs, and dispute files",
  "ERP, payment, and webhook integration tracking",
  "Backup snapshots, restore tracking, and compliance controls",
  "Role-based workspace access for finance and collections teams",
  "Payment reconciliation with dispute tracking and audit logs",
  "Cash forecasting and aging analytics for finance leaders",
];
