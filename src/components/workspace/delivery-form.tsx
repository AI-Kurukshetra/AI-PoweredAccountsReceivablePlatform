"use client";

import { useActionState, useState } from "react";
import type { DeliveryActionState } from "@/app/(workspace)/deliveries/actions";
import { FormSubmitButton } from "@/components/workspace/form-submit-button";

type InvoiceOption = {
  id: string;
  label: string;
};

export function DeliveryForm({
  invoices,
  action,
}: {
  invoices: InvoiceOption[];
  action: (
    state: DeliveryActionState,
    formData: FormData,
  ) => Promise<DeliveryActionState>;
}) {
  const [state, formAction] = useActionState(action, {});
  const [status, setStatus] = useState("queued");

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
        <select name="invoiceId" required defaultValue="" className="form-select">
          <option value="" disabled>
            Select invoice
          </option>
          {invoices.map((invoice) => (
            <option key={invoice.id} value={invoice.id}>
              {invoice.label}
            </option>
          ))}
        </select>
      </label>

      <div className="grid gap-5 md:grid-cols-2">
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-[var(--foreground)]">
            Channel
          </span>
          <select name="channel" defaultValue="email" className="form-select">
            <option value="email">Email</option>
            <option value="sms">SMS</option>
            <option value="portal">Portal</option>
            <option value="postal">Postal</option>
          </select>
        </label>
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-[var(--foreground)]">
            Status
          </span>
          <select
            name="status"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            className="form-select"
          >
            <option value="queued">Queued</option>
            <option value="sent">Sent</option>
            <option value="delivered">Delivered</option>
            <option value="confirmed">Confirmed</option>
            <option value="failed">Failed</option>
          </select>
        </label>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-[var(--foreground)]">
            Recipient
          </span>
          <input name="recipient" placeholder="recipient@example.com" className="form-input" />
        </label>
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-[var(--foreground)]">
            Tracking reference
          </span>
          <input name="trackingRef" placeholder="MSG-3001" className="form-input" />
        </label>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-[var(--foreground)]">
            Scheduled for
          </span>
          <input name="scheduledFor" type="datetime-local" className="form-input" />
        </label>
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-[var(--foreground)]">
            Failure reason
          </span>
          <input
            name="failureReason"
            required={status === "failed"}
            placeholder="Mailbox rejected message"
            className="form-input"
          />
        </label>
      </div>

      <FormSubmitButton label="Create delivery" pendingLabel="Creating delivery..." />
    </form>
  );
}
