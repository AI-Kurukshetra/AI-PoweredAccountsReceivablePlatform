"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getMembershipContext } from "@/lib/company";
import { createClient } from "@/lib/supabase/server";

export type RecoveryActionState = {
  error?: string;
};

const recoverySchema = z.object({
  snapshotName: z.string().trim().min(3, "Snapshot name is required."),
  scope: z.string().trim().min(3, "Snapshot scope is required."),
  backupKind: z.enum(["nightly", "manual", "pre_release", "compliance"]),
  status: z.enum(["completed", "running", "failed", "verified"]),
  storageRef: z.string().trim().min(4, "Storage reference is required."),
  notes: z.preprocess(
    (value) => (value === "" || value === null ? undefined : value),
    z.string().trim().optional(),
  ),
  expiresAt: z.preprocess(
    (value) => (value === "" || value === null ? undefined : value),
    z.string().optional(),
  ),
  restoreTestedAt: z.preprocess(
    (value) => (value === "" || value === null ? undefined : value),
    z.string().optional(),
  ),
});

export async function createRecoverySnapshotAction(
  _prevState: RecoveryActionState,
  formData: FormData,
) {
  const membership = await getMembershipContext();

  if (!membership) {
    return { error: "Company membership not found." };
  }

  const parsed = recoverySchema.safeParse({
    snapshotName: formData.get("snapshotName"),
    scope: formData.get("scope"),
    backupKind: formData.get("backupKind"),
    status: formData.get("status"),
    storageRef: formData.get("storageRef"),
    notes: formData.get("notes"),
    expiresAt: formData.get("expiresAt"),
    restoreTestedAt: formData.get("restoreTestedAt"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid recovery snapshot." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("recovery_snapshots").insert({
    company_id: membership.companyId,
    snapshot_name: parsed.data.snapshotName,
    scope: parsed.data.scope,
    backup_kind: parsed.data.backupKind,
    status: parsed.data.status,
    storage_ref: parsed.data.storageRef,
    notes: parsed.data.notes ?? null,
    expires_at: parsed.data.expiresAt
      ? new Date(parsed.data.expiresAt).toISOString()
      : null,
    restore_tested_at: parsed.data.restoreTestedAt
      ? new Date(parsed.data.restoreTestedAt).toISOString()
      : null,
    created_by: membership.userId,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/recovery");
  redirect("/recovery");
}
