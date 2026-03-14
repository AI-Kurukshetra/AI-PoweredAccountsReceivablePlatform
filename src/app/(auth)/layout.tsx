export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="app-shell min-h-screen px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto grid min-h-[calc(100vh-5rem)] max-w-6xl gap-8 lg:grid-cols-[1fr_440px]">
        <section className="card-surface hidden rounded-[36px] p-8 lg:block">
          <p className="text-xs font-medium uppercase tracking-[0.3em] text-[var(--stroke-strong)]">
            InvoicedOS auth
          </p>
          <h1 className="mt-4 max-w-lg text-5xl font-semibold leading-tight tracking-[-0.04em] text-[var(--foreground)]">
            Finance teams sign in once, then operate the full AR workflow.
          </h1>
          <div className="mt-10 space-y-4">
            {[
              "Supabase email/password auth with SSR cookies",
              "Protected workspace routes behind session checks",
              "Confirmation callback ready for email verification",
            ].map((item) => (
              <div
                key={item}
                className="rounded-[24px] bg-[rgba(255,255,255,0.52)] px-5 py-4 text-sm text-[rgba(22,33,31,0.74)]"
              >
                {item}
              </div>
            ))}
          </div>
        </section>

        <section className="card-surface rounded-[36px] p-6 sm:p-8">
          {children}
        </section>
      </div>
    </div>
  );
}
