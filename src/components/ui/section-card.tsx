export function SectionCard({
  title,
  eyebrow,
  children,
}: {
  title: string;
  eyebrow?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="card-surface rounded-[28px] p-6 sm:p-7">
      {eyebrow ? (
        <p className="text-xs font-medium uppercase tracking-[0.24em] text-[var(--stroke-strong)]">
          {eyebrow}
        </p>
      ) : null}
      <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-[var(--foreground)]">
        {title}
      </h2>
      <div className="mt-5">{children}</div>
    </section>
  );
}
