"use client";

import { useActionState } from "react";
import type { AccessInviteState } from "@/app/(workspace)/access/actions";
import { FormSubmitButton } from "@/components/workspace/form-submit-button";

export function MemberInviteForm({
  action,
}: {
  action: (
    state: AccessInviteState,
    formData: FormData,
  ) => Promise<AccessInviteState>;
}) {
  const [state, formAction] = useActionState(action, {});

  return (
    <form action={formAction} className="space-y-4">
      {state.error ? (
        <div className="rounded-2xl border border-[rgba(217,72,95,0.22)] bg-[rgba(217,72,95,0.1)] px-4 py-3 text-sm text-[var(--danger)]">
          {state.error}
        </div>
      ) : null}

      {state.success ? (
        <div className="rounded-2xl border border-[rgba(47,143,107,0.22)] bg-[rgba(47,143,107,0.12)] px-4 py-3 text-sm text-[var(--success)]">
          {state.success}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-[var(--foreground)]">
            Full name
          </span>
          <input
            name="fullName"
            type="text"
            required
            minLength={2}
            placeholder="Priya Patel"
            className="form-input"
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-medium text-[var(--foreground)]">
            Email
          </span>
          <input
            name="email"
            type="email"
            required
            placeholder="priya@company.com"
            className="form-input"
          />
        </label>
      </div>

      <label className="block">
        <span className="mb-2 block text-sm font-medium text-[var(--foreground)]">
          Role
        </span>
        <select name="role" defaultValue="viewer" className="form-select">
          <option value="admin">admin</option>
          <option value="finance_manager">finance manager</option>
          <option value="collector">collector</option>
          <option value="viewer">viewer</option>
        </select>
      </label>

      <p className="text-sm leading-6 text-[var(--ink-soft)]">
        Existing users are added immediately. New emails receive an invite and will land in this
        company workspace after accepting it.
      </p>

      <FormSubmitButton label="Add company member" pendingLabel="Adding member..." />
    </form>
  );
}
