import Link from "next/link";

export default function AuthErrorPage() {
  return (
    <div className="app-shell flex min-h-screen items-center justify-center px-4 py-10 sm:px-6 lg:px-8">
      <div className="card-surface max-w-xl rounded-[36px] p-8 text-center">
        <p className="text-xs font-medium uppercase tracking-[0.28em] text-[var(--stroke-strong)]">
          Auth error
        </p>
        <h1 className="mt-4 text-3xl font-semibold text-[var(--foreground)]">
          We could not verify that sign-in link.
        </h1>
        <p className="mt-4 text-sm leading-7 text-[rgba(22,33,31,0.72)]">
          Try signing in again or request a fresh confirmation email from the signup flow.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Link
            href="/login"
            className="rounded-full bg-[var(--surface-strong)] px-5 py-3 text-sm font-medium text-[var(--background)]"
          >
            Go to login
          </Link>
          <Link
            href="/signup"
            className="rounded-full border border-[var(--stroke)] px-5 py-3 text-sm font-medium text-[var(--foreground)]"
          >
            Create account
          </Link>
        </div>
      </div>
    </div>
  );
}
