export function EmptyState({
  title,
  copy,
}: {
  title: string;
  copy: string;
}) {
  return (
    <div className="rounded-[28px] border border-dashed border-[rgba(182,171,149,0.34)] bg-[linear-gradient(180deg,rgba(255,255,255,0.55),rgba(255,248,235,0.76))] px-6 py-12 text-center">
      <div className="mx-auto h-14 w-14 rounded-full bg-[rgba(12,166,120,0.12)]" />
      <h3 className="mt-5 text-xl font-semibold tracking-[-0.02em] text-[var(--foreground)]">
        {title}
      </h3>
      <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-[var(--ink-soft)]">
        {copy}
      </p>
    </div>
  );
}
