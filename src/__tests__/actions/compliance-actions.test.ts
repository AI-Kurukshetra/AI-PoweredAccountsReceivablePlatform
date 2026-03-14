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

import { createSecurityControlAction } from "@/app/(workspace)/compliance/actions";

function buildFormData(values: Record<string, string>) {
  const formData = new FormData();
  Object.entries(values).forEach(([key, value]) => formData.set(key, value));
  return formData;
}

describe("createSecurityControlAction", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("requires a company membership context", async () => {
    mockGetMembershipContext.mockResolvedValue(null);

    const result = await createSecurityControlAction({}, new FormData());

    expect(result).toEqual({ error: "Company membership not found." });
  });

  it("creates a security control for valid input", async () => {
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

    await createSecurityControlAction(
      {},
      buildFormData({
        category: "Payments",
        controlName: "Webhook signature verification",
        framework: "PCI DSS",
        status: "monitoring",
        owner: "Payments team",
        lastReviewedAt: "2026-03-14T10:00",
        nextReviewDue: "2026-04-14T10:00",
        notes: "Review on each gateway rollout",
      }),
    );

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        company_id: "company-1",
        category: "Payments",
        control_name: "Webhook signature verification",
        framework: "PCI DSS",
        status: "monitoring",
        owner: "Payments team",
        notes: "Review on each gateway rollout",
        created_by: "user-1",
      }),
    );
    expect(mockRevalidatePath).toHaveBeenCalledWith("/compliance");
    expect(mockRedirect).toHaveBeenCalledWith("/compliance");
  });
});
