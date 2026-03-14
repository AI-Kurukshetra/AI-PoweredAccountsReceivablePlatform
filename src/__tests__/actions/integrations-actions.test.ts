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
  createIntegrationAction,
  runIntegrationSyncAction,
} from "@/app/(workspace)/integrations/actions";

function buildFormData(values: Record<string, string>) {
  const formData = new FormData();
  Object.entries(values).forEach(([key, value]) => formData.set(key, value));
  return formData;
}

describe("createIntegrationAction", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns validation errors for malformed webhook urls", async () => {
    mockGetMembershipContext.mockResolvedValue({
      companyId: "company-1",
      userId: "user-1",
    });

    const result = await createIntegrationAction(
      {},
      buildFormData({
        name: "Stripe Feed",
        provider: "Stripe",
        category: "payments",
        status: "healthy",
        webhookUrl: "not-a-url",
      }),
    );

    expect(result.error).toBeDefined();
    expect(mockCreateClient).not.toHaveBeenCalled();
  });

  it("inserts the integration with normalized config", async () => {
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

    await createIntegrationAction(
      {},
      buildFormData({
        name: "NetSuite ERP Sync",
        provider: "NetSuite",
        category: "erp",
        status: "healthy",
        healthNote: "Sync healthy",
        webhookUrl: "https://example.com/webhooks/netsuite",
        lastSyncAt: "2026-03-14T10:30",
        scope: "Customers, invoices",
      }),
    );

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        company_id: "company-1",
        name: "NetSuite ERP Sync",
        provider: "NetSuite",
        category: "erp",
        status: "healthy",
        health_note: "Sync healthy",
        webhook_url: "https://example.com/webhooks/netsuite",
        created_by: "user-1",
        config: { scope: "Customers, invoices" },
      }),
    );
    expect(mockRevalidatePath).toHaveBeenCalledWith("/integrations");
    expect(mockRedirect).toHaveBeenCalledWith("/integrations");
  });
});

describe("runIntegrationSyncAction", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("records a successful sync run and updates connection health", async () => {
    mockGetMembershipContext.mockResolvedValue({
      companyId: "company-1",
      userId: "user-1",
    });

    const mockIntegrationMaybeSingle = jest.fn().mockResolvedValue({
      data: {
        id: "integration-1",
        name: "NetSuite Sync",
        provider: "NetSuite",
      },
    });
    const mockSyncRunMaybeSingle = jest.fn().mockResolvedValue({
      data: { id: "sync-run-1" },
    });
    const mockCountEq = jest.fn().mockResolvedValue({ count: 4 });
    const mockCountEq2 = jest.fn().mockResolvedValue({ count: 6 });
    const mockCountEq3 = jest.fn().mockResolvedValue({ count: 2 });
    const mockSyncUpdateEqSecond = jest.fn().mockResolvedValue({ error: null });
    const mockSyncUpdateEqFirst = jest.fn(() => ({ eq: mockSyncUpdateEqSecond }));
    const mockConnectionUpdateEqSecond = jest.fn().mockResolvedValue({ error: null });
    const mockConnectionUpdateEqFirst = jest.fn(() => ({ eq: mockConnectionUpdateEqSecond }));
    const mockAuditInsert = jest.fn().mockResolvedValue({ error: null });

    mockCreateClient.mockResolvedValue({
      from: jest.fn((table: string) => {
        if (table === "integration_connections") {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                eq: jest.fn(() => ({
                  maybeSingle: mockIntegrationMaybeSingle,
                })),
              })),
            })),
            update: jest.fn(() => ({
              eq: mockConnectionUpdateEqFirst,
            })),
          };
        }

        if (table === "integration_sync_runs") {
          return {
            insert: jest.fn(() => ({
              select: jest.fn(() => ({
                maybeSingle: mockSyncRunMaybeSingle,
              })),
            })),
            update: jest.fn(() => ({
              eq: mockSyncUpdateEqFirst,
            })),
          };
        }

        if (table === "invoices") {
          return {
            select: jest.fn(() => ({
              eq: mockCountEq,
            })),
          };
        }

        if (table === "customers") {
          return {
            select: jest.fn(() => ({
              eq: mockCountEq2,
            })),
          };
        }

        if (table === "payments") {
          return {
            select: jest.fn(() => ({
              eq: mockCountEq3,
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
    formData.set("integrationId", "550e8400-e29b-41d4-a716-446655440000");
    formData.set("direction", "bi_directional");

    await runIntegrationSyncAction(formData);

    expect(mockSyncRunMaybeSingle).toHaveBeenCalled();
    expect(mockSyncUpdateEqSecond).toHaveBeenCalled();
    expect(mockConnectionUpdateEqSecond).toHaveBeenCalled();
    expect(mockAuditInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        company_id: "company-1",
        action: "integration.sync",
      }),
    );
    expect(mockRevalidatePath).toHaveBeenCalledWith("/integrations");
    expect(mockRedirect).toHaveBeenCalledWith("/integrations");
  });
});
