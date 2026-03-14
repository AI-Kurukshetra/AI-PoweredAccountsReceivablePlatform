export function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

export function statusClasses(
  tone: "neutral" | "brand" | "accent" | "success" | "danger" | "info",
) {
  const classes = {
    neutral: "bg-[rgba(227,234,244,0.76)] text-[var(--foreground)]",
    brand: "bg-[rgba(61,115,231,0.12)] text-[var(--brand)]",
    accent: "bg-[rgba(242,178,76,0.18)] text-[#a86d11]",
    success: "bg-[rgba(44,154,105,0.14)] text-[var(--success)]",
    danger: "bg-[rgba(223,106,103,0.14)] text-[var(--danger)]",
    info: "bg-[rgba(77,131,247,0.14)] text-[var(--info)]",
  };

  return classes[tone];
}
