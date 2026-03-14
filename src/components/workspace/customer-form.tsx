"use client";

import { useActionState } from "react";
import type { CustomerActionState } from "@/app/(workspace)/customers/actions";
import { FormSubmitButton } from "@/components/workspace/form-submit-button";

export function CustomerForm({
  action,
}: {
  action: (
    state: CustomerActionState,
    formData: FormData,
  ) => Promise<CustomerActionState>;
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
          Customer name
        </span>
        <input
          name="name"
          required
          minLength={2}
          className="form-input"
        />
      </label>

      <div className="grid gap-5 md:grid-cols-2">
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-[var(--foreground)]">
            Email
          </span>
          <input
            name="email"
            type="email"
            className="form-input"
          />
        </label>
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-[var(--foreground)]">
            Segment
          </span>
          <input
            name="segment"
            placeholder="Enterprise"
            className="form-input"
          />
        </label>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-[var(--foreground)]">
            External reference
          </span>
          <input
            name="externalRef"
            placeholder="C-201"
            className="form-input"
          />
        </label>
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-[var(--foreground)]">
            Owner
          </span>
          <input
            name="owner"
            minLength={2}
            placeholder="Collections lead"
            className="form-input"
          />
        </label>
      </div>

      <div className="grid gap-5 md:grid-cols-3">
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-[var(--foreground)]">
            Payment terms
          </span>
          <input
            name="paymentTermsDays"
            type="number"
            min="0"
            defaultValue="30"
            className="form-input"
          />
        </label>
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-[var(--foreground)]">
            Credit limit
          </span>
          <input
            name="creditLimit"
            type="number"
            min="0"
            step="0.01"
            defaultValue="0"
            className="form-input"
          />
        </label>
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-[var(--foreground)]">
            Risk
          </span>
          <select
            name="risk"
            defaultValue="Medium"
            className="form-select"
          >
            <option>Low</option>
            <option>Medium</option>
            <option>High</option>
          </select>
        </label>
      </div>

      <FormSubmitButton
        label="Create customer"
        pendingLabel="Creating customer..."
      />
    </form>
  );
}
