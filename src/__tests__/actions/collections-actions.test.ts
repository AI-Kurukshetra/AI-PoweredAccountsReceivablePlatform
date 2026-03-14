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
  createReminderPolicyAction,
  runReminderAutomationAction,
} from "@/app/(workspace)/collections/actions";

function buildFormData(values: Record<string, string>) {
  const formData = new FormData();
  Object.entries(values).forEach(([key, value]) => formData.set(key, value));
  return formData;
}

describe("createReminderPolicyAction", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("inserts reminder policy rules", async () => {
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

    await createReminderPolicyAction(
      buildFormData({
        name: "Pre-due reminder",
        triggerType: "before_due",
        daysOffset: "5",
        channel: "email",
        stage: "5 days before due date",
        isActive: "on",
      }),
    );

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        company_id: "company-1",
        name: "Pre-due reminder",
        trigger_type: "before_due",
        days_offset: 5,
        channel: "email",
        stage: "5 days before due date",
        is_active: true,
        created_by: "user-1",
      }),
    );
    expect(mockRevalidatePath).toHaveBeenCalledWith("/collections");
    expect(mockRedirect).toHaveBeenCalledWith("/collections");
  });
});

describe("runReminderAutomationAction", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("queues reminder records and marks late invoices overdue", async () => {
    mockGetMembershipContext.mockResolvedValue({
      companyId: "company-1",
      userId: "user-1",
    });

    const mockPoliciesEqSecond = jest.fn().mockResolvedValue({
      data: [
        {
          id: "policy-1",
          trigger_type: "after_due",
          days_offset: 3,
          channel: "sms",
          stage: "3 days overdue",
        },
      ],
    });
    const mockInvoicesGt = jest.fn().mockResolvedValue({
      data: [
        {
          id: "invoice-1",
          customer_id: "customer-1",
          due_date: "2026-03-01",
          status: "sent",
          balance_due: 500,
        },
      ],
    });
    const mockExistingIn = jest.fn().mockResolvedValue({ data: [] });
    const mockInvoiceUpdateIn = jest.fn().mockResolvedValue({ error: null });
    const mockRemindersInsert = jest.fn().mockResolvedValue({ error: null });

    mockCreateClient.mockResolvedValue({
      from: jest.fn((table: string) => {
        if (table === "reminder_policies") {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                eq: mockPoliciesEqSecond,
              })),
            })),
          };
        }
        if (table === "invoices") {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                in: jest.fn(() => ({
                  gt: mockInvoicesGt,
                })),
              })),
            })),
            update: jest.fn(() => ({
              eq: jest.fn(() => ({
                in: mockInvoiceUpdateIn,
              })),
            })),
          };
        }
        if (table === "reminders") {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                in: mockExistingIn,
              })),
            })),
            insert: mockRemindersInsert,
          };
        }
        return {};
      }),
    });

    await runReminderAutomationAction();

    expect(mockInvoiceUpdateIn).toHaveBeenCalled();
    expect(mockRemindersInsert).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          company_id: "company-1",
          invoice_id: "invoice-1",
          customer_id: "customer-1",
          channel: "sms",
          stage: "3 days overdue",
          status: "queued",
        }),
      ]),
    );
    expect(mockRevalidatePath).toHaveBeenCalledWith("/collections");
    expect(mockRevalidatePath).toHaveBeenCalledWith("/invoices");
    expect(mockRedirect).toHaveBeenCalledWith("/collections");
  });
});
