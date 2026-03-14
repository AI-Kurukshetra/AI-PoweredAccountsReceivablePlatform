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

import { createIntegrationAction } from "@/app/(workspace)/integrations/actions";

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
