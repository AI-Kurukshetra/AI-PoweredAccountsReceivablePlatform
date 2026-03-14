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

import { createDeliveryAction } from "@/app/(workspace)/deliveries/actions";

function buildFormData(values: Record<string, string>) {
  const formData = new FormData();
  Object.entries(values).forEach(([key, value]) => formData.set(key, value));
  return formData;
}

describe("createDeliveryAction", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("requires a failure reason when the delivery failed", async () => {
    mockGetMembershipContext.mockResolvedValue({
      companyId: "company-1",
      userId: "user-1",
    });

    const result = await createDeliveryAction(
      {},
      buildFormData({
        invoiceId: "550e8400-e29b-41d4-a716-446655440000",
        channel: "email",
        status: "failed",
      }),
    );

    expect(result).toEqual({
      error: "Add a failure reason when the delivery status is failed.",
    });
  });

  it("creates a delivery record for a valid invoice", async () => {
    mockGetMembershipContext.mockResolvedValue({
      companyId: "company-1",
      userId: "user-1",
    });

    const mockInvoiceSingle = jest.fn().mockResolvedValue({
      data: {
        id: "invoice-1",
        customer_id: "customer-1",
      },
      error: null,
    });
    const mockInvoiceEqSecond = jest.fn(() => ({ single: mockInvoiceSingle }));
    const mockInvoiceEqFirst = jest.fn(() => ({ eq: mockInvoiceEqSecond }));
    const mockInvoiceSelect = jest.fn(() => ({ eq: mockInvoiceEqFirst }));

    const mockInsert = jest.fn().mockResolvedValue({ error: null });

    mockCreateClient.mockResolvedValue({
      from: jest.fn((table: string) => {
        if (table === "invoices") {
          return { select: mockInvoiceSelect };
        }

        if (table === "invoice_deliveries") {
          return { insert: mockInsert };
        }

        throw new Error(`Unexpected table ${table}`);
      }),
    });

    await createDeliveryAction(
      {},
      buildFormData({
        invoiceId: "550e8400-e29b-41d4-a716-446655440000",
        channel: "portal",
        status: "confirmed",
        recipient: "ap@example.com",
        trackingRef: "PORTAL-1",
        scheduledFor: "2026-03-14T10:15",
      }),
    );

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        company_id: "company-1",
        invoice_id: "invoice-1",
        customer_id: "customer-1",
        channel: "portal",
        status: "confirmed",
        recipient: "ap@example.com",
        tracking_ref: "PORTAL-1",
        created_by: "user-1",
      }),
    );
    expect(mockRevalidatePath).toHaveBeenCalledWith("/deliveries");
    expect(mockRedirect).toHaveBeenCalledWith("/deliveries");
  });
});
