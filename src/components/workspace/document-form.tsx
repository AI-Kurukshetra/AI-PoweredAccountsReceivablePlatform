"use client";

import { useActionState, useState } from "react";
import type { DocumentActionState } from "@/app/(workspace)/documents/actions";
import { FormSubmitButton } from "@/components/workspace/form-submit-button";

type CustomerOption = {
  id: string;
  name: string;
};

type InvoiceOption = {
  id: string;
  label: string;
};

type DisputeOption = {
  id: string;
  label: string;
};

export function DocumentForm({
  customers,
  invoices,
  disputes,
  action,
}: {
  customers: CustomerOption[];
  invoices: InvoiceOption[];
  disputes: DisputeOption[];
  action: (
    state: DocumentActionState,
    formData: FormData,
  ) => Promise<DocumentActionState>;
}) {
  const [state, formAction] = useActionState(action, {});
  const [customerId, setCustomerId] = useState("");
  const [invoiceId, setInvoiceId] = useState("");
  const [disputeId, setDisputeId] = useState("");
  const needsLink = !customerId && !invoiceId && !disputeId;

  return (
    <form action={formAction} className="space-y-5">
      {state.error ? (
        <div className="rounded-2xl border border-[rgba(217,72,95,0.22)] bg-[rgba(217,72,95,0.1)] px-4 py-3 text-sm text-[var(--danger)]">
          {state.error}
        </div>
      ) : null}

      <label className="block">
        <span className="mb-2 block text-sm font-medium text-[var(--foreground)]">
          Storage path
        </span>
        <input
          name="bucketPath"
          required
          placeholder="company-1/invoices/INV-3001.pdf"
          className="form-input"
        />
      </label>

      <div className="grid gap-5 md:grid-cols-2">
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-[var(--foreground)]">
            Document kind
          </span>
          <select name="kind" defaultValue="invoice_pdf" className="form-select">
            <option value="invoice_pdf">Invoice PDF</option>
            <option value="contract">Contract</option>
            <option value="proof">Proof</option>
            <option value="dispute_attachment">Dispute attachment</option>
          </select>
        </label>
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-[var(--foreground)]">
            Customer
          </span>
          <select
            name="customerId"
            value={customerId}
            onChange={(event) => setCustomerId(event.target.value)}
            required={needsLink}
            className="form-select"
          >
            <option value="">Optional</option>
            {customers.map((customer) => (
              <option key={customer.id} value={customer.id}>
                {customer.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-[var(--foreground)]">
            Invoice
          </span>
          <select
            name="invoiceId"
            value={invoiceId}
            onChange={(event) => setInvoiceId(event.target.value)}
            required={needsLink}
            className="form-select"
          >
            <option value="">Optional</option>
            {invoices.map((invoice) => (
              <option key={invoice.id} value={invoice.id}>
                {invoice.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-[var(--foreground)]">
            Dispute
          </span>
          <select
            name="disputeId"
            value={disputeId}
            onChange={(event) => setDisputeId(event.target.value)}
            required={needsLink}
            className="form-select"
          >
            <option value="">Optional</option>
            {disputes.map((dispute) => (
              <option key={dispute.id} value={dispute.id}>
                {dispute.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <FormSubmitButton
        label="Register document"
        pendingLabel="Registering document..."
      />
    </form>
  );
}
