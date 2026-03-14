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

import { createTemplateAction } from "@/app/(workspace)/templates/actions";

function buildFormData(values: Record<string, string>) {
  const formData = new FormData();
  Object.entries(values).forEach(([key, value]) => formData.set(key, value));
  return formData;
}

describe("createTemplateAction", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns a membership error when no company context exists", async () => {
    mockGetMembershipContext.mockResolvedValue(null);

    const result = await createTemplateAction({} , new FormData());

    expect(result).toEqual({ error: "Company membership not found." });
  });

  it("returns validation errors for malformed template input", async () => {
    mockGetMembershipContext.mockResolvedValue({
      companyId: "company-1",
      userId: "user-1",
    });

    const result = await createTemplateAction(
      {},
      buildFormData({
        name: "Collections",
        paymentTermsDays: "30",
        accentColor: "blue",
      }),
    );

    expect(result.error).toBe("Use a full hex color such as #3d73e7.");
    expect(mockCreateClient).not.toHaveBeenCalled();
  });

  it("resets existing defaults and inserts the new default template", async () => {
    mockGetMembershipContext.mockResolvedValue({
      companyId: "company-1",
      userId: "user-1",
    });

    const mockInsert = jest.fn().mockResolvedValue({ error: null });
    const mockResetEq = jest.fn().mockResolvedValue({ error: null });
    const mockUpdate = jest.fn(() => ({ eq: mockResetEq }));

    mockCreateClient.mockResolvedValue({
      from: jest.fn(() => ({
        insert: mockInsert,
        update: mockUpdate,
      })),
    });

    await createTemplateAction(
      {},
      buildFormData({
        name: "Enterprise Standard",
        description: "Default monthly invoice template",
        deliveryChannel: "email",
        paymentTermsDays: "45",
        accentColor: "#3d73e7",
        footerText: "Questions? Contact ar@example.com",
        isDefault: "on",
      }),
    );

    expect(mockUpdate).toHaveBeenCalledWith({ is_default: false });
    expect(mockResetEq).toHaveBeenCalledWith("company_id", "company-1");
    expect(mockInsert).toHaveBeenCalledWith({
      company_id: "company-1",
      name: "Enterprise Standard",
      description: "Default monthly invoice template",
      delivery_channel: "email",
      payment_terms_days: 45,
      accent_color: "#3d73e7",
      footer_text: "Questions? Contact ar@example.com",
      is_default: true,
      created_by: "user-1",
    });
    expect(mockRevalidatePath).toHaveBeenCalledWith("/templates");
    expect(mockRevalidatePath).toHaveBeenCalledWith("/invoices/new");
    expect(mockRedirect).toHaveBeenCalledWith("/templates");
  });
});
