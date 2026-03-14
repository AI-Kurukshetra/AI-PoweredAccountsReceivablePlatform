"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getMembershipContext } from "@/lib/company";
import { createClient } from "@/lib/supabase/server";

export type DocumentActionState = {
  error?: string;
};

const documentSchema = z.object({
  bucketPath: z.string().trim().min(4, "Bucket path is required."),
  kind: z.enum(["invoice_pdf", "contract", "proof", "dispute_attachment"]),
  customerId: z.preprocess(
    (value) => (value === "" || value === null ? undefined : value),
    z.string().uuid().optional(),
  ),
  invoiceId: z.preprocess(
    (value) => (value === "" || value === null ? undefined : value),
    z.string().uuid().optional(),
  ),
  disputeId: z.preprocess(
    (value) => (value === "" || value === null ? undefined : value),
    z.string().uuid().optional(),
  ),
});

export async function createDocumentAction(
  _prevState: DocumentActionState,
  formData: FormData,
) {
  const membership = await getMembershipContext();

  if (!membership) {
    return { error: "Company membership not found." };
  }

  const parsed = documentSchema.safeParse({
    bucketPath: formData.get("bucketPath"),
    kind: formData.get("kind"),
    customerId: formData.get("customerId"),
    invoiceId: formData.get("invoiceId"),
    disputeId: formData.get("disputeId"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid document." };
  }

  if (!parsed.data.customerId && !parsed.data.invoiceId && !parsed.data.disputeId) {
    return { error: "Link the document to a customer, invoice, or dispute." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("documents").insert({
    company_id: membership.companyId,
    customer_id: parsed.data.customerId ?? null,
    invoice_id: parsed.data.invoiceId ?? null,
    dispute_id: parsed.data.disputeId ?? null,
    bucket_path: parsed.data.bucketPath,
    kind: parsed.data.kind,
    uploaded_by: membership.userId,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/documents");
  redirect("/documents");
}
