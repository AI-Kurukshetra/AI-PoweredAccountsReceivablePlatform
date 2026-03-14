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
  createInvoiceAutomationAction,
  runInvoiceAutomationsAction,
} from "@/app/(workspace)/invoices/automation-actions";

function buildFormData(values: Record<string, string>) {
  const formData = new FormData();
  Object.entries(values).forEach(([key, value]) => formData.set(key, value));
  return formData;
}

describe("createInvoiceAutomationAction", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("creates a recurring invoice automation schedule", async () => {
    mockGetMembershipContext.mockResolvedValue({
      companyId: "company-1",
      userId: "user-1",
    });

    const mockInsert = jest.fn().mockResolvedValue({ error: null });
    mockCreateClient.mockResolvedValue({
      from: jest.fn((table: string) => {
        if (table === "invoice_automations") {
          return {
            insert: mockInsert,
          };
        }
        return {};
      }),
    });

    await createInvoiceAutomationAction(
      buildFormData({
        customerId: "550e8400-e29b-41d4-a716-446655440000",
        templateId: "",
        name: "Monthly service billing",
        automationMode: "recurring",
        cadenceDays: "30",
        nextRunDate: "2026-03-20",
        autoSend: "on",
        deliveryChannel: "email",
        defaultNotes: "Auto-generated invoice",
        lineItemsJson:
          '[{"description":"Retainer","quantity":1,"unitPrice":2500,"taxRate":8.25}]',
      }),
    );

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        company_id: "company-1",
        customer_id: "550e8400-e29b-41d4-a716-446655440000",
        name: "Monthly service billing",
        automation_mode: "recurring",
        cadence_days: 30,
        next_run_date: "2026-03-20",
        auto_send: true,
        delivery_channel: "email",
        default_notes: "Auto-generated invoice",
        created_by: "user-1",
      }),
    );
    expect(mockRevalidatePath).toHaveBeenCalledWith("/invoices");
    expect(mockRevalidatePath).toHaveBeenCalledWith("/dashboard");
    expect(mockRedirect).toHaveBeenCalledWith("/invoices");
  });
});

describe("runInvoiceAutomationsAction", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("generates invoices and delivery records for due automation schedules", async () => {
    mockGetMembershipContext.mockResolvedValue({
      companyId: "company-1",
      userId: "user-1",
    });

    const mockAutomationLte = jest.fn().mockResolvedValue({
      data: [
        {
          id: "automation-1",
          customer_id: "customer-1",
          template_id: null,
          name: "Monthly recurring",
          cadence_days: 30,
          next_run_date: "2026-03-14",
          auto_send: true,
          delivery_channel: "email",
          default_notes: "Generated",
          line_items: [
            {
              description: "Retainer",
              quantity: 1,
              unitPrice: 2000,
              taxRate: 10,
            },
          ],
        },
      ],
    });
    const mockCustomersIn = jest.fn().mockResolvedValue({
      data: [{ id: "customer-1", email: "ap@example.com", payment_terms_days: 21 }],
    });
    const mockInvoiceMaybeSingle = jest.fn().mockResolvedValue({
      data: { id: "invoice-1" },
    });
    const mockLineItemsInsert = jest.fn().mockResolvedValue({ error: null });
    const mockDeliveryInsert = jest.fn().mockResolvedValue({ error: null });
    const mockAutomationUpdateEqSecond = jest.fn().mockResolvedValue({ error: null });
    const mockAutomationUpdateEqFirst = jest.fn(() => ({ eq: mockAutomationUpdateEqSecond }));
    const mockAutomationUpdate = jest.fn(() => ({ eq: mockAutomationUpdateEqFirst }));

    mockCreateClient.mockResolvedValue({
      from: jest.fn((table: string) => {
        if (table === "invoice_automations") {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                eq: jest.fn(() => ({
                  lte: mockAutomationLte,
                })),
              })),
            })),
            update: mockAutomationUpdate,
          };
        }

        if (table === "customers") {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                in: mockCustomersIn,
              })),
            })),
          };
        }

        if (table === "invoices") {
          return {
            insert: jest.fn(() => ({
              select: jest.fn(() => ({
                maybeSingle: mockInvoiceMaybeSingle,
              })),
            })),
          };
        }

        if (table === "invoice_line_items") {
          return {
            insert: mockLineItemsInsert,
          };
        }

        if (table === "invoice_deliveries") {
          return {
            insert: mockDeliveryInsert,
          };
        }

        return {};
      }),
    });

    await runInvoiceAutomationsAction(new FormData());

    expect(mockLineItemsInsert).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          invoice_id: "invoice-1",
          description: "Retainer",
        }),
      ]),
    );
    expect(mockDeliveryInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        invoice_id: "invoice-1",
        customer_id: "customer-1",
        channel: "email",
        recipient: "ap@example.com",
      }),
    );
    expect(mockAutomationUpdate).toHaveBeenCalled();
    expect(mockRevalidatePath).toHaveBeenCalledWith("/invoices");
    expect(mockRevalidatePath).toHaveBeenCalledWith("/deliveries");
    expect(mockRedirect).toHaveBeenCalledWith("/invoices");
  });
});
