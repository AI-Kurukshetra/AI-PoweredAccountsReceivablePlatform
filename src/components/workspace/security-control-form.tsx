"use client";

import { useActionState } from "react";
import type { ComplianceActionState } from "@/app/(workspace)/compliance/actions";
import { FormSubmitButton } from "@/components/workspace/form-submit-button";

export function SecurityControlForm({
  action,
}: {
  action: (
    state: ComplianceActionState,
    formData: FormData,
  ) => Promise<ComplianceActionState>;
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
            Category
          </span>
          <input name="category" required minLength={2} placeholder="Payments" className="form-input" />
        </label>
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-[var(--foreground)]">
            Framework
          </span>
          <select name="framework" defaultValue="SOC 2" className="form-select">
            <option value="SOC 2">SOC 2</option>
            <option value="PCI DSS">PCI DSS</option>
            <option value="Internal">Internal</option>
          </select>
        </label>
      </div>

      <label className="block">
        <span className="mb-2 block text-sm font-medium text-[var(--foreground)]">
          Control name
        </span>
        <input name="controlName" required minLength={3} className="form-input" />
      </label>

      <div className="grid gap-5 md:grid-cols-3">
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-[var(--foreground)]">
            Status
          </span>
          <select name="status" defaultValue="planned" className="form-select">
            <option value="planned">Planned</option>
            <option value="implemented">Implemented</option>
            <option value="monitoring">Monitoring</option>
            <option value="gap">Gap</option>
          </select>
        </label>
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-[var(--foreground)]">
            Owner
          </span>
          <input name="owner" minLength={2} placeholder="Security lead" className="form-input" />
        </label>
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-[var(--foreground)]">
            Last reviewed
          </span>
          <input name="lastReviewedAt" type="datetime-local" className="form-input" />
        </label>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-[var(--foreground)]">
            Next review due
          </span>
          <input name="nextReviewDue" type="datetime-local" className="form-input" />
        </label>
      </div>

      <label className="block">
        <span className="mb-2 block text-sm font-medium text-[var(--foreground)]">
          Notes
        </span>
        <textarea name="notes" rows={3} className="form-textarea" />
      </label>

      <FormSubmitButton label="Create control" pendingLabel="Creating control..." />
    </form>
  );
}
