"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { useSearchParams } from "next/navigation";
import type { AuthActionState } from "@/app/(auth)/actions";

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="mt-2 inline-flex w-full items-center justify-center rounded-full bg-[var(--surface-strong)] px-5 py-3 text-sm font-medium text-[var(--background)] hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Please wait..." : label}
    </button>
  );
}

export function AuthForm({
  mode,
  action,
}: {
  mode: "login" | "signup";
  action: (
    state: AuthActionState,
    formData: FormData,
  ) => Promise<AuthActionState>;
}) {
  const [state, formAction] = useActionState(action, {});
  const searchParams = useSearchParams();
  const message = searchParams.get("message");

  return (
    <form action={formAction} className="space-y-4">
      {message ? (
        <div className="rounded-2xl border border-[rgba(47,143,107,0.22)] bg-[rgba(47,143,107,0.12)] px-4 py-3 text-sm text-[var(--success)]">
          {message}
        </div>
      ) : null}

      {state.error ? (
        <div className="rounded-2xl border border-[rgba(217,72,95,0.22)] bg-[rgba(217,72,95,0.1)] px-4 py-3 text-sm text-[var(--danger)]">
          {state.error}
        </div>
      ) : null}

      {mode === "signup" ? (
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-[var(--foreground)]">
            Full name
          </span>
          <input
            name="fullName"
            type="text"
            required
            minLength={2}
            placeholder="Finance owner"
            className="w-full rounded-2xl border border-[rgba(141,128,102,0.24)] bg-[rgba(255,255,255,0.74)] px-4 py-3 text-sm text-[var(--foreground)] outline-none focus:border-[var(--brand)]"
          />
        </label>
      ) : null}

      <label className="block">
        <span className="mb-2 block text-sm font-medium text-[var(--foreground)]">
          Email
        </span>
        <input
          name="email"
          type="email"
          required
          placeholder="you@company.com"
          className="w-full rounded-2xl border border-[rgba(141,128,102,0.24)] bg-[rgba(255,255,255,0.74)] px-4 py-3 text-sm text-[var(--foreground)] outline-none focus:border-[var(--brand)]"
        />
      </label>

      <label className="block">
        <span className="mb-2 block text-sm font-medium text-[var(--foreground)]">
          Password
        </span>
        <input
          name="password"
          type="password"
          required
          minLength={8}
          placeholder="At least 8 characters"
          className="w-full rounded-2xl border border-[rgba(141,128,102,0.24)] bg-[rgba(255,255,255,0.74)] px-4 py-3 text-sm text-[var(--foreground)] outline-none focus:border-[var(--brand)]"
        />
      </label>

      <SubmitButton label={mode === "login" ? "Sign in" : "Create account"} />

      <p className="text-sm text-[rgba(22,33,31,0.68)]">
        {mode === "login" ? "Need an account?" : "Already have an account?"}{" "}
        <Link
          href={mode === "login" ? "/signup" : "/login"}
          className="font-medium text-[var(--brand)]"
        >
          {mode === "login" ? "Create one" : "Sign in"}
        </Link>
      </p>
    </form>
  );
}
