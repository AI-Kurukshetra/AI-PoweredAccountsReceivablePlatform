"use client";

import { useActionState } from "react";
import type { TemplateActionState } from "@/app/(workspace)/templates/actions";
import { FormSubmitButton } from "@/components/workspace/form-submit-button";

export function TemplateForm({
  action,
}: {
  action: (
    state: TemplateActionState,
    formData: FormData,
  ) => Promise<TemplateActionState>;
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
            Template name
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
            Delivery channel
          </span>
          <input
            name="deliveryChannel"
            placeholder="email"
            className="form-input"
          />
        </label>
      </div>

      <label className="block">
        <span className="mb-2 block text-sm font-medium text-[var(--foreground)]">
          Description
        </span>
        <textarea
          name="description"
          rows={3}
          className="form-textarea"
        />
      </label>

      <div className="grid gap-5 md:grid-cols-2">
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-[var(--foreground)]">
            Default payment terms
          </span>
          <input
            name="paymentTermsDays"
            type="number"
            min="0"
            max="365"
            defaultValue="30"
            className="form-input"
          />
        </label>
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-[var(--foreground)]">
            Accent color
          </span>
          <input
            name="accentColor"
            type="text"
            defaultValue="#3d73e7"
            pattern="^#[0-9a-fA-F]{6}$"
            title="Use a full hex color such as #3d73e7"
            className="form-input"
          />
        </label>
      </div>

      <label className="block">
        <span className="mb-2 block text-sm font-medium text-[var(--foreground)]">
          Footer text
        </span>
        <textarea
          name="footerText"
          rows={3}
          className="form-textarea"
        />
      </label>

      <label className="flex items-center gap-3 rounded-[18px] border border-[var(--stroke)] bg-white px-4 py-3 text-sm text-[var(--foreground)]">
        <input type="checkbox" name="isDefault" className="h-4 w-4" />
        Mark as default invoice template
      </label>

      <FormSubmitButton
        label="Create template"
        pendingLabel="Creating template..."
      />
    </form>
  );
}
