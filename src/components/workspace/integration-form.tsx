"use client";

import { useActionState } from "react";
import type { IntegrationActionState } from "@/app/(workspace)/integrations/actions";
import { FormSubmitButton } from "@/components/workspace/form-submit-button";

export function IntegrationForm({
  action,
}: {
  action: (
    state: IntegrationActionState,
    formData: FormData,
  ) => Promise<IntegrationActionState>;
}) {
  const [state, formAction] = useActionState(action, {});

  return (
    <form action={formAction} className="space-y-5">
      {state.error ? (
        <div className="rounded-2xl border border-[rgba(217,72,95,0.22)] bg-[rgba(217,72,95,0.1)] px-4 py-3 text-sm text-[var(--danger)]">
          {state.error}
        </div>
      ) : null}

      <div className="grid gap-5 md:grid-cols-2">
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-[var(--foreground)]">
            Connection name
          </span>
          <input
            name="name"
            required
            minLength={2}
            className="form-input"
          />
        </label>
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-[var(--foreground)]">
            Provider
          </span>
          <input
            name="provider"
            required
            minLength={2}
            placeholder="NetSuite"
            className="form-input"
          />
        </label>
      </div>

      <div className="grid gap-5 md:grid-cols-3">
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-[var(--foreground)]">
            Category
          </span>
          <select name="category" defaultValue="erp" className="form-select">
            <option value="erp">ERP</option>
            <option value="payments">Payments</option>
            <option value="communications">Communications</option>
            <option value="webhook">Webhook</option>
          </select>
        </label>
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-[var(--foreground)]">
            Status
          </span>
          <select name="status" defaultValue="planned" className="form-select">
            <option value="planned">Planned</option>
            <option value="healthy">Healthy</option>
            <option value="review">Review</option>
            <option value="lagging">Lagging</option>
          </select>
        </label>
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-[var(--foreground)]">
            Last sync
          </span>
          <input
            name="lastSyncAt"
            type="datetime-local"
            className="form-input"
          />
        </label>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-[var(--foreground)]">
            Scope
          </span>
          <input
            name="scope"
            placeholder="Customers, invoices, settlements"
            className="form-input"
          />
        </label>
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-[var(--foreground)]">
            Webhook URL
          </span>
          <input
            name="webhookUrl"
            type="url"
            placeholder="https://example.com/webhooks/invoices"
            className="form-input"
          />
        </label>
      </div>

      <label className="block">
        <span className="mb-2 block text-sm font-medium text-[var(--foreground)]">
          Health note
        </span>
        <textarea
          name="healthNote"
          rows={3}
          className="form-textarea"
        />
      </label>

      <FormSubmitButton
        label="Create connection"
        pendingLabel="Creating connection..."
      />
    </form>
  );
}
