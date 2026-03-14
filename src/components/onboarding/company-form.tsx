"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import type { OnboardingState } from "@/app/onboarding/actions";

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex w-full items-center justify-center rounded-full bg-[var(--surface-strong)] px-5 py-3 text-sm font-medium text-[var(--background)] hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Creating workspace..." : "Create company workspace"}
    </button>
  );
}

export function CompanyForm({
  action,
}: {
  action: (
    state: OnboardingState,
    formData: FormData,
  ) => Promise<OnboardingState>;
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
          Company name
        </span>
        <input
          name="companyName"
          type="text"
          required
          minLength={2}
          placeholder="Northstar Finance Ops"
          className="w-full rounded-2xl border border-[rgba(141,128,102,0.24)] bg-[rgba(255,255,255,0.74)] px-4 py-3 text-sm text-[var(--foreground)] outline-none focus:border-[var(--brand)]"
        />
      </label>

      <label className="block">
        <span className="mb-2 block text-sm font-medium text-[var(--foreground)]">
          Legal name
        </span>
        <input
          name="legalName"
          type="text"
          minLength={2}
          placeholder="Northstar Holdings LLC"
          className="w-full rounded-2xl border border-[rgba(141,128,102,0.24)] bg-[rgba(255,255,255,0.74)] px-4 py-3 text-sm text-[var(--foreground)] outline-none focus:border-[var(--brand)]"
        />
      </label>

      <label className="block">
        <span className="mb-2 block text-sm font-medium text-[var(--foreground)]">
          Base currency
        </span>
        <input
          name="baseCurrency"
          type="text"
          required
          defaultValue="USD"
          minLength={3}
          maxLength={3}
          pattern="[A-Za-z]{3}"
          className="w-full rounded-2xl border border-[rgba(141,128,102,0.24)] bg-[rgba(255,255,255,0.74)] px-4 py-3 text-sm uppercase text-[var(--foreground)] outline-none focus:border-[var(--brand)]"
        />
      </label>

      <label className="flex items-start gap-3 rounded-2xl border border-[rgba(141,128,102,0.18)] bg-[rgba(255,255,255,0.5)] px-4 py-4">
        <input
          name="seedDemoData"
          type="checkbox"
          defaultChecked
          className="mt-1 h-4 w-4 accent-[var(--brand)]"
        />
        <span className="text-sm leading-6 text-[rgba(22,33,31,0.72)]">
          Seed sample customers, invoices, payments, reminders, and disputes so the dashboard is populated immediately.
        </span>
      </label>

      <SubmitButton />
    </form>
  );
}
