"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getMembershipContext } from "@/lib/company";
import { createClient } from "@/lib/supabase/server";

export type CustomerActionState = {
  error?: string;
};

const customerSchema = z.object({
  name: z.string().trim().min(2, "Customer name is required."),
  email: z.preprocess(
    (value) => (value === "" || value === null ? undefined : value),
    z.email().optional(),
  ),
  segment: z.preprocess(
    (value) => (value === "" || value === null ? undefined : value),
    z.string().trim().optional(),
  ),
  externalRef: z.preprocess(
    (value) => (value === "" || value === null ? undefined : value),
    z.string().trim().optional(),
  ),
  paymentTermsDays: z.coerce
    .number()
    .int()
    .min(0, "Payment terms cannot be negative.")
    .max(365, "Payment terms are too large."),
  creditLimit: z.coerce
    .number()
    .min(0, "Credit limit cannot be negative."),
  owner: z.preprocess(
    (value) => (value === "" || value === null ? undefined : value),
    z.string().trim().optional(),
  ),
  risk: z.enum(["Low", "Medium", "High"]),
});

export async function createCustomerAction(
  _prevState: CustomerActionState,
  formData: FormData,
) {
  const membership = await getMembershipContext();

  if (!membership) {
    return { error: "Company membership not found." };
  }

  const parsed = customerSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    segment: formData.get("segment"),
    externalRef: formData.get("externalRef"),
    paymentTermsDays: formData.get("paymentTermsDays"),
    creditLimit: formData.get("creditLimit"),
    owner: formData.get("owner"),
    risk: formData.get("risk"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid customer." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("customers").insert({
    company_id: membership.companyId,
    name: parsed.data.name,
    email: parsed.data.email ?? null,
    segment: parsed.data.segment ?? null,
    external_ref: parsed.data.externalRef ?? null,
    payment_terms_days: parsed.data.paymentTermsDays,
    credit_limit: parsed.data.creditLimit,
    metadata: {
      owner: parsed.data.owner ?? membership.userName ?? membership.userEmail,
      risk: parsed.data.risk,
    },
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/customers");
  revalidatePath("/dashboard");
  redirect("/customers");
}
