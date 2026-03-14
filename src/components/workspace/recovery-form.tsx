"use client";

import { useActionState } from "react";
import type { RecoveryActionState } from "@/app/(workspace)/recovery/actions";
import { FormSubmitButton } from "@/components/workspace/form-submit-button";

export function RecoveryForm({
  action,
}: {
  action: (
    state: RecoveryActionState,
    formData: FormData,
  ) => Promise<RecoveryActionState>;
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
            Snapshot name
          </span>
          <input name="snapshotName" required minLength={3} className="form-input" />
        </label>
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-[var(--foreground)]">
            Scope
          </span>
          <input
            name="scope"
            required
            minLength={3}
            placeholder="postgres + storage metadata"
            className="form-input"
          />
        </label>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-[var(--foreground)]">
            Backup kind
          </span>
          <select name="backupKind" defaultValue="manual" className="form-select">
            <option value="nightly">Nightly</option>
            <option value="manual">Manual</option>
            <option value="pre_release">Pre-release</option>
            <option value="compliance">Compliance</option>
          </select>
        </label>
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-[var(--foreground)]">
            Status
          </span>
          <select name="status" defaultValue="completed" className="form-select">
            <option value="completed">Completed</option>
            <option value="running">Running</option>
            <option value="failed">Failed</option>
            <option value="verified">Verified</option>
          </select>
        </label>
      </div>

      <label className="block">
        <span className="mb-2 block text-sm font-medium text-[var(--foreground)]">
          Storage reference
        </span>
        <input name="storageRef" required minLength={4} placeholder="s3://..." className="form-input" />
      </label>

      <div className="grid gap-5 md:grid-cols-2">
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-[var(--foreground)]">
            Expires at
          </span>
          <input name="expiresAt" type="datetime-local" className="form-input" />
        </label>
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-[var(--foreground)]">
            Restore tested at
          </span>
          <input name="restoreTestedAt" type="datetime-local" className="form-input" />
        </label>
      </div>

      <label className="block">
        <span className="mb-2 block text-sm font-medium text-[var(--foreground)]">
          Notes
        </span>
        <textarea name="notes" rows={3} className="form-textarea" />
      </label>

      <FormSubmitButton label="Register snapshot" pendingLabel="Registering snapshot..." />
    </form>
  );
}
