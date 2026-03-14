"use client";

import { useActionState } from "react";
import type { GatewayActionState } from "@/app/(workspace)/gateways/actions";
import { FormSubmitButton } from "@/components/workspace/form-submit-button";

export function GatewayForm({
  action,
}: {
  action: (
    state: GatewayActionState,
    formData: FormData,
  ) => Promise<GatewayActionState>;
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
            Account label
          </span>
          <input name="accountLabel" required minLength={2} className="form-input" />
        </label>
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-[var(--foreground)]">
            Provider
          </span>
          <input name="provider" required minLength={2} placeholder="Stripe" className="form-input" />
        </label>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-[var(--foreground)]">
            Status
          </span>
          <select name="status" defaultValue="sandbox" className="form-select">
            <option value="sandbox">Sandbox</option>
            <option value="configured">Configured</option>
            <option value="live">Live</option>
            <option value="paused">Paused</option>
          </select>
        </label>
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-[var(--foreground)]">
            Webhook status
          </span>
          <select name="webhookStatus" defaultValue="planned" className="form-select">
            <option value="planned">Planned</option>
            <option value="healthy">Healthy</option>
            <option value="degraded">Degraded</option>
            <option value="not_required">Not required</option>
          </select>
        </label>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-[var(--foreground)]">
            Supported channels
          </span>
          <input
            name="supportedChannels"
            required
            minLength={2}
            placeholder="card, ach, wallet"
            className="form-input"
          />
        </label>
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-[var(--foreground)]">
            Checkout URL
          </span>
          <input name="checkoutUrl" type="url" placeholder="https://..." className="form-input" />
        </label>
      </div>

      <div className="grid gap-5 md:grid-cols-3">
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-[var(--foreground)]">
            Settlement days
          </span>
          <input name="settlementDays" type="number" min="0" max="30" defaultValue="2" className="form-input" />
        </label>
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-[var(--foreground)]">
            Merchant ref
          </span>
          <input name="merchantRef" placeholder="acct_live_01" className="form-input" />
        </label>
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-[var(--foreground)]">
            Last event
          </span>
          <input name="lastEventAt" type="datetime-local" className="form-input" />
        </label>
      </div>

      <FormSubmitButton label="Create gateway" pendingLabel="Creating gateway..." />
    </form>
  );
}
