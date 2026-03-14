"use client";

import { useActionState } from "react";
import type { PaymentActionState } from "@/app/(workspace)/payments/actions";
import { FormSubmitButton } from "@/components/workspace/form-submit-button";

type InvoiceOption = {
  id: string;
  invoiceNumber: string;
  customerName: string;
  balanceDue: number;
};

export function PaymentForm({
  invoices,
  action,
}: {
  invoices: InvoiceOption[];
  action: (
    state: PaymentActionState,
    formData: FormData,
  ) => Promise<PaymentActionState>;
}) {
  const [state, formAction] = useActionState(action, {});

  return (
    <form action={formAction} className="space-y-5">
      {state.error ? (
        <div className="rounded-2xl border border-[rgba(217,72,95,0.22)] bg-[rgba(217,72,95,0.1)] px-4 py-3 text-sm text-[var(--danger)]">
          {state.error}
        </div>
      ) : null}

      <label className="block">
        <span className="mb-2 block text-sm font-medium text-[var(--foreground)]">
          Invoice
        </span>
        <select
          name="invoiceId"
          required
          defaultValue=""
          className="form-select"
        >
          <option value="" disabled>
            Select invoice to reconcile
          </option>
          {invoices.map((invoice) => (
            <option key={invoice.id} value={invoice.id}>
              {invoice.invoiceNumber} · {invoice.customerName} · Open $
              {invoice.balanceDue.toFixed(2)}
            </option>
          ))}
        </select>
      </label>

      <div className="grid gap-5 md:grid-cols-2">
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-[var(--foreground)]">
            Amount
          </span>
          <input
            name="amount"
            type="number"
            min="0.01"
            step="0.01"
            required
            className="form-input"
          />
        </label>
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-[var(--foreground)]">
            Received at
          </span>
          <input
            name="receivedAt"
            type="datetime-local"
            className="form-input"
          />
        </label>
      </div>

      <div className="grid gap-5 md:grid-cols-3">
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-[var(--foreground)]">
            Channel
          </span>
          <select
            name="channel"
            defaultValue="ach"
            className="form-select"
          >
            <option value="card">Card</option>
            <option value="ach">ACH</option>
            <option value="wire">Wire</option>
            <option value="wallet">Wallet</option>
          </select>
        </label>
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-[var(--foreground)]">
            Status
          </span>
          <select
            name="status"
            defaultValue="settled"
            className="form-select"
          >
            <option value="pending">Pending</option>
            <option value="settled">Settled</option>
            <option value="failed">Failed</option>
            <option value="refunded">Refunded</option>
          </select>
        </label>
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-[var(--foreground)]">
            External reference
          </span>
          <input
            name="externalRef"
            placeholder="PMT-1001"
            className="form-input"
          />
        </label>
      </div>

      <FormSubmitButton
        label="Record payment"
        pendingLabel="Recording payment..."
      />
    </form>
  );
}
