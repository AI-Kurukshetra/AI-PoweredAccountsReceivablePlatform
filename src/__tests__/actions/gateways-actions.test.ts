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

import { createGatewayAction } from "@/app/(workspace)/gateways/actions";

function buildFormData(values: Record<string, string>) {
  const formData = new FormData();
  Object.entries(values).forEach(([key, value]) => formData.set(key, value));
  return formData;
}

describe("createGatewayAction", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns a membership error when no workspace context exists", async () => {
    mockGetMembershipContext.mockResolvedValue(null);

    const result = await createGatewayAction({}, new FormData());

    expect(result).toEqual({ error: "Company membership not found." });
  });

  it("normalizes channel lists before inserting a gateway account", async () => {
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

    await createGatewayAction(
      {},
      buildFormData({
        accountLabel: "Stripe US",
        provider: "Stripe",
        status: "live",
        supportedChannels: "card, ACH, wallet",
        checkoutUrl: "https://payments.example.com/checkout",
        webhookStatus: "healthy",
        settlementDays: "2",
        merchantRef: "acct_live_01",
        lastEventAt: "2026-03-14T09:45",
      }),
    );

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        company_id: "company-1",
        account_label: "Stripe US",
        provider: "Stripe",
        status: "live",
        supported_channels: ["card", "ach", "wallet"],
        checkout_url: "https://payments.example.com/checkout",
        webhook_status: "healthy",
        merchant_ref: "acct_live_01",
        created_by: "user-1",
      }),
    );
    expect(mockRevalidatePath).toHaveBeenCalledWith("/gateways");
    expect(mockRevalidatePath).toHaveBeenCalledWith("/portal");
    expect(mockRedirect).toHaveBeenCalledWith("/gateways");
  });
});
