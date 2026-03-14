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
  resolveCreditAlertAction,
  runCreditAlertScanAction,
} from "@/app/(workspace)/customers/actions";

function buildFormData(values: Record<string, string>) {
  const formData = new FormData();
  Object.entries(values).forEach(([key, value]) => formData.set(key, value));
  return formData;
}

describe("runCreditAlertScanAction", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("creates credit alerts for over-limit exposure", async () => {
    mockGetMembershipContext.mockResolvedValue({
      companyId: "company-1",
      userId: "user-1",
    });

    const mockCustomersEq = jest.fn().mockResolvedValue({
      data: [
        {
          id: "customer-1",
          name: "Harborline Hotels",
          credit_limit: 1000,
        },
      ],
    });
    const mockInvoicesIn = jest.fn().mockResolvedValue({
      data: [
        {
          id: "invoice-1",
          customer_id: "customer-1",
          balance_due: 1500,
          due_date: "2026-03-01",
          status: "overdue",
        },
      ],
    });
    const mockOpenAlertsEqSecond = jest.fn().mockResolvedValue({
      data: [],
    });
    const mockAlertInsert = jest.fn().mockResolvedValue({ error: null });

    mockCreateClient.mockResolvedValue({
      from: jest.fn((table: string) => {
        if (table === "customers") {
          return {
            select: jest.fn(() => ({
              eq: mockCustomersEq,
            })),
          };
        }

        if (table === "invoices") {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                gt: jest.fn(() => ({
                  in: mockInvoicesIn,
                })),
              })),
            })),
          };
        }

        if (table === "credit_alerts") {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                eq: mockOpenAlertsEqSecond,
              })),
            })),
            insert: mockAlertInsert,
            update: jest.fn(() => ({
              eq: jest.fn(() => ({
                in: jest.fn().mockResolvedValue({ error: null }),
              })),
            })),
          };
        }

        return {};
      }),
    });

    await runCreditAlertScanAction();

    expect(mockAlertInsert).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          company_id: "company-1",
          customer_id: "customer-1",
          reason: "Over credit limit",
          severity: "critical",
          status: "open",
          created_by: "user-1",
        }),
      ]),
    );
    expect(mockRevalidatePath).toHaveBeenCalledWith("/customers");
    expect(mockRedirect).toHaveBeenCalledWith("/customers");
  });
});

describe("resolveCreditAlertAction", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("marks a credit alert as resolved", async () => {
    mockGetMembershipContext.mockResolvedValue({
      companyId: "company-1",
      userId: "user-1",
    });

    const mockUpdateEqSecond = jest.fn().mockResolvedValue({ error: null });
    const mockUpdateEqFirst = jest.fn(() => ({ eq: mockUpdateEqSecond }));
    const mockUpdate = jest.fn(() => ({ eq: mockUpdateEqFirst }));

    mockCreateClient.mockResolvedValue({
      from: jest.fn(() => ({
        update: mockUpdate,
      })),
    });

    await resolveCreditAlertAction(
      buildFormData({
        alertId: "550e8400-e29b-41d4-a716-446655440000",
      }),
    );

    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "resolved",
      }),
    );
    expect(mockRevalidatePath).toHaveBeenCalledWith("/customers");
    expect(mockRedirect).toHaveBeenCalledWith("/customers");
  });
});
