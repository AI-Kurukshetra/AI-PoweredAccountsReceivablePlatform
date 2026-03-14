import { EmptyState } from "@/components/ui/empty-state";
import { SectionCard } from "@/components/ui/section-card";
import { TemplateForm } from "@/components/workspace/template-form";
import { createTemplateAction } from "@/app/(workspace)/templates/actions";
import { getMembershipContext } from "@/lib/company";
import { createClient } from "@/lib/supabase/server";

type TemplateRow = {
  id: string;
  name: string;
  description: string | null;
  delivery_channel: string | null;
  payment_terms_days: number;
  accent_color: string;
  footer_text: string | null;
  is_default: boolean;
  created_at: string;
};

export default async function TemplatesPage() {
  const membership = await getMembershipContext();

  if (!membership) {
    return null;
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("invoice_templates")
    .select(
      "id, name, description, delivery_channel, payment_terms_days, accent_color, footer_text, is_default, created_at",
    )
    .eq("company_id", membership.companyId)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: false });

  const templates = (data ?? []) as TemplateRow[];

  return (
    <div className="space-y-5">
      <section className="card-surface rounded-[28px] p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-xs uppercase tracking-[0.24em] text-[var(--stroke-strong)]">
              Templates
            </p>
            <h2 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-[var(--foreground)]">
              Manage invoice templates with delivery defaults, terms, and branded footer copy.
            </h2>
            <p className="mt-3 text-sm leading-6 text-[var(--ink-soft)]">
              This closes the custom invoice template gap from the must-have blueprint without forcing template logic into the invoice form first.
            </p>
          </div>
          <div className="soft-panel rounded-xl px-4 py-3 text-sm">
            <p className="text-[var(--stroke-strong)]">Templates tracked</p>
            <p className="mt-1 font-semibold text-[var(--foreground)]">{templates.length}</p>
          </div>
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <SectionCard eyebrow="Library" title="Saved invoice templates">
          {templates.length ? (
            <div className="space-y-3">
              {templates.map((template) => (
                <article
                  key={template.id}
                  className="rounded-[22px] border border-[var(--stroke)] bg-white p-5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.18em] text-[var(--stroke-strong)]">
                        {template.delivery_channel ?? "manual"} delivery
                      </p>
                      <h3 className="mt-2 text-lg font-semibold text-[var(--foreground)]">
                        {template.name}
                      </h3>
                    </div>
                    {template.is_default ? (
                      <span className="inline-flex rounded-full bg-[var(--brand-soft)] px-3 py-1 text-xs font-semibold text-[var(--brand)]">
                        Default
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-4 grid gap-4 md:grid-cols-[0.9fr_0.9fr_0.6fr]">
                    <div>
                      <p className="text-sm text-[var(--stroke-strong)]">Description</p>
                      <p className="mt-1 text-sm text-[var(--foreground)]">
                        {template.description ?? "No description"}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-[var(--stroke-strong)]">Footer</p>
                      <p className="mt-1 text-sm text-[var(--foreground)]">
                        {template.footer_text ?? "No footer text"}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-[var(--stroke-strong)]">Terms</p>
                      <p className="mt-1 text-sm font-semibold text-[var(--foreground)]">
                        Net {template.payment_terms_days}
                      </p>
                      <div className="mt-3 flex items-center gap-2">
                        <span
                          className="h-4 w-4 rounded-full border border-[var(--stroke)]"
                          style={{ backgroundColor: template.accent_color }}
                        />
                        <span className="text-xs text-[var(--ink-soft)]">
                          {template.accent_color}
                        </span>
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <EmptyState
              title="No templates saved"
              copy="Create a default invoice template so the team has a consistent brand and payment-term baseline."
            />
          )}
        </SectionCard>

        <SectionCard eyebrow="Create" title="Add template">
          <TemplateForm action={createTemplateAction} />
        </SectionCard>
      </div>
    </div>
  );
}
