import { EmptyState } from "@/components/ui/empty-state";
import { SectionCard } from "@/components/ui/section-card";
import { DocumentForm } from "@/components/workspace/document-form";
import { createDocumentAction } from "@/app/(workspace)/documents/actions";
import { getWorkspaceSnapshot } from "@/lib/workspace-data";
import { getMembershipContext } from "@/lib/company";
import { createClient } from "@/lib/supabase/server";

type RelatedValue = {
  name?: string;
  invoice_number?: string;
  title?: string;
} | null;

type DocumentRow = {
  id: string;
  bucket_path: string;
  kind: string;
  created_at: string;
  customer: RelatedValue | RelatedValue[];
  invoice: RelatedValue | RelatedValue[];
  dispute: RelatedValue | RelatedValue[];
};

function normalizeRelation<T>(value: T | T[] | null): T | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

export default async function DocumentsPage() {
  const membership = await getMembershipContext();
  const snapshot = await getWorkspaceSnapshot();

  if (!membership || !snapshot) {
    return null;
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("documents")
    .select(
      `
        id,
        bucket_path,
        kind,
        created_at,
        customer:customers(name),
        invoice:invoices(invoice_number),
        dispute:disputes(title)
      `,
    )
    .eq("company_id", membership.companyId)
    .order("created_at", { ascending: false });

  const documents = ((data ?? []) as DocumentRow[]).map((document) => ({
    ...document,
    customer: normalizeRelation(document.customer),
    invoice: normalizeRelation(document.invoice),
    dispute: normalizeRelation(document.dispute),
  }));

  return (
    <div className="space-y-5">
      <section className="card-surface rounded-[28px] p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-xs uppercase tracking-[0.24em] text-[var(--stroke-strong)]">
              Documents
            </p>
            <h2 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-[var(--foreground)]">
              Register invoice PDFs, contract files, proofs, and dispute attachments in one ledger.
            </h2>
            <p className="mt-3 text-sm leading-6 text-[var(--ink-soft)]">
              Storage upload can come later. This module already gives the team a document index tied to customer and invoice records.
            </p>
          </div>
          <div className="soft-panel rounded-xl px-4 py-3 text-sm">
            <p className="text-[var(--stroke-strong)]">Documents indexed</p>
            <p className="mt-1 font-semibold text-[var(--foreground)]">{documents.length}</p>
          </div>
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[1.12fr_0.88fr]">
        <SectionCard eyebrow="Registry" title="Document links and context">
          {documents.length ? (
            <div className="space-y-3">
              {documents.map((document) => (
                <article
                  key={document.id}
                  className="rounded-[22px] border border-[var(--stroke)] bg-white p-5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.18em] text-[var(--stroke-strong)]">
                        {document.kind.replaceAll("_", " ")}
                      </p>
                      <h3 className="mt-2 text-base font-semibold text-[var(--foreground)]">
                        {document.bucket_path}
                      </h3>
                    </div>
                    <p className="text-xs text-[var(--ink-soft)]">
                      {new Date(document.created_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                  <div className="mt-4 grid gap-3 md:grid-cols-3">
                    <div>
                      <p className="text-sm text-[var(--stroke-strong)]">Customer</p>
                      <p className="mt-1 text-sm text-[var(--foreground)]">
                        {document.customer?.name ?? "Not linked"}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-[var(--stroke-strong)]">Invoice</p>
                      <p className="mt-1 text-sm text-[var(--foreground)]">
                        {document.invoice?.invoice_number ?? "Not linked"}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-[var(--stroke-strong)]">Dispute</p>
                      <p className="mt-1 text-sm text-[var(--foreground)]">
                        {document.dispute?.title ?? "Not linked"}
                      </p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <EmptyState
              title="No documents registered"
              copy="Add storage paths for invoice or contract files so finance and collections can work from one indexed record."
            />
          )}
        </SectionCard>

        <SectionCard eyebrow="Register" title="Add document record">
          <DocumentForm
            customers={snapshot.customers.map((customer) => ({
              id: customer.id,
              name: customer.name,
            }))}
            invoices={snapshot.invoices.map((invoice) => ({
              id: invoice.id,
              label: `${invoice.invoice_number} · ${invoice.customer?.name ?? "Unknown"}`,
            }))}
            disputes={snapshot.disputes.map((dispute) => ({
              id: dispute.id,
              label: `${dispute.invoice?.invoice_number ?? "Dispute"} · ${dispute.title}`,
            }))}
            action={createDocumentAction}
          />
        </SectionCard>
      </div>
    </div>
  );
}
