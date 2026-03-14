const mockRedirect = jest.fn();
const mockRevalidatePath = jest.fn();
const mockGetMembershipContext = jest.fn();
const mockCreateClient = jest.fn();

jest.mock("next/navigation", () => ({
  redirect: (...args: unknown[]) => mockRedirect(...args),
}));

jest.mock("next/cache", () => ({
  revalidatePath: (...args: unknown[]) => mockRevalidatePath(...args),
}));

jest.mock("@/lib/company", () => ({
  getMembershipContext: (...args: unknown[]) => mockGetMembershipContext(...args),
}));

jest.mock("@/lib/supabase/server", () => ({
  createClient: (...args: unknown[]) => mockCreateClient(...args),
}));

import {
  createRecoverySnapshotAction,
  runRestoreDrillAction,
} from "@/app/(workspace)/recovery/actions";

function buildFormData(values: Record<string, string>) {
  const formData = new FormData();
  Object.entries(values).forEach(([key, value]) => formData.set(key, value));
  return formData;
}

describe("createRecoverySnapshotAction", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns validation errors for incomplete snapshot data", async () => {
    mockGetMembershipContext.mockResolvedValue({
      companyId: "company-1",
      userId: "user-1",
    });

    const result = await createRecoverySnapshotAction(
      {},
      buildFormData({
        snapshotName: "nightly-prod-2026-03-14",
      }),
    );

    expect(result.error).toContain("Invalid input: expected string");
  });

  it("inserts a recovery snapshot for valid input", async () => {
    mockGetMembershipContext.mockResolvedValue({
      companyId: "company-1",
      userId: "user-1",
    });

    const mockInsert = jest.fn().mockResolvedValue({ error: null });
    mockCreateClient.mockResolvedValue({
      from: jest.fn(() => ({
        insert: mockInsert,
      })),
    });

    await createRecoverySnapshotAction(
      {},
      buildFormData({
        snapshotName: "nightly-prod-2026-03-14",
        scope: "postgres + storage",
        backupKind: "nightly",
        status: "verified",
        storageRef: "s3://backups/invoiced/nightly-prod-2026-03-14.dump",
        notes: "Restore tested in staging",
        expiresAt: "2026-04-13T02:00",
        restoreTestedAt: "2026-03-14T07:00",
      }),
    );

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        company_id: "company-1",
        snapshot_name: "nightly-prod-2026-03-14",
        scope: "postgres + storage",
        backup_kind: "nightly",
        status: "verified",
        storage_ref: "s3://backups/invoiced/nightly-prod-2026-03-14.dump",
        notes: "Restore tested in staging",
        created_by: "user-1",
      }),
    );
    expect(mockRevalidatePath).toHaveBeenCalledWith("/recovery");
    expect(mockRedirect).toHaveBeenCalledWith("/recovery");
  });
});

describe("runRestoreDrillAction", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("marks a recovery snapshot as verified and logs an audit entry", async () => {
    mockGetMembershipContext.mockResolvedValue({
      companyId: "company-1",
      userId: "user-1",
    });

    const mockUpdateEqSecond = jest.fn().mockResolvedValue({ error: null });
    const mockUpdateEqFirst = jest.fn(() => ({ eq: mockUpdateEqSecond }));
    const mockAuditInsert = jest.fn().mockResolvedValue({ error: null });

    mockCreateClient.mockResolvedValue({
      from: jest.fn((table: string) => {
        if (table === "recovery_snapshots") {
          return {
            update: jest.fn(() => ({
              eq: mockUpdateEqFirst,
            })),
          };
        }
        if (table === "audit_logs") {
          return {
            insert: mockAuditInsert,
          };
        }
        return {};
      }),
    });

    const formData = new FormData();
    formData.set("snapshotId", "550e8400-e29b-41d4-a716-446655440000");

    await runRestoreDrillAction(formData);

    expect(mockUpdateEqSecond).toHaveBeenCalled();
    expect(mockAuditInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        company_id: "company-1",
        action: "snapshot.restore_drill",
      }),
    );
    expect(mockRevalidatePath).toHaveBeenCalledWith("/recovery");
    expect(mockRedirect).toHaveBeenCalledWith("/recovery");
  });
});
