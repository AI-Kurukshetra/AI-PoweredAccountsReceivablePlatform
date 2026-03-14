const mockRevalidatePath = jest.fn();
const mockGetMembershipContext = jest.fn();
const mockBuildPortalToken = jest.fn();
const mockCreateClient = jest.fn();

jest.mock("next/cache", () => ({
  revalidatePath: (...args: unknown[]) => mockRevalidatePath(...args),
}));

jest.mock("@/lib/company", () => ({
  getMembershipContext: (...args: unknown[]) => mockGetMembershipContext(...args),
}));

jest.mock("@/lib/portal", () => ({
  buildPortalToken: (...args: unknown[]) => mockBuildPortalToken(...args),
}));

jest.mock("@/lib/supabase/server", () => ({
  createClient: (...args: unknown[]) => mockCreateClient(...args),
}));

import { updatePortalAccessAction } from "@/app/(workspace)/portal/actions";

function buildFormData(values: Record<string, string>) {
  const formData = new FormData();
  Object.entries(values).forEach(([key, value]) => formData.set(key, value));
  return formData;
}

describe("updatePortalAccessAction", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("enables access and generates a token when one does not exist", async () => {
    mockGetMembershipContext.mockResolvedValue({
      companyId: "company-1",
    });
    mockBuildPortalToken.mockReturnValue("portal-token-1");

    const mockMaybeSingle = jest.fn().mockResolvedValue({
      data: { portal_access_token: null },
    });
    const mockSelectEqSecond = jest.fn(() => ({ maybeSingle: mockMaybeSingle }));
    const mockSelectEqFirst = jest.fn(() => ({ eq: mockSelectEqSecond }));
    const mockSelect = jest.fn(() => ({ eq: mockSelectEqFirst }));

    const mockUpdateEqSecond = jest.fn().mockResolvedValue({ error: null });
    const mockUpdateEqFirst = jest.fn(() => ({ eq: mockUpdateEqSecond }));
    const mockUpdate = jest.fn(() => ({ eq: mockUpdateEqFirst }));

    mockCreateClient.mockResolvedValue({
      from: jest.fn(() => ({
        select: mockSelect,
        update: mockUpdate,
      })),
    });

    await updatePortalAccessAction(
      buildFormData({
        customerId: "550e8400-e29b-41d4-a716-446655440000",
        intent: "enable",
      }),
    );

    expect(mockUpdate).toHaveBeenCalledWith({
      portal_enabled: true,
      portal_access_token: "portal-token-1",
    });
    expect(mockRevalidatePath).toHaveBeenCalledWith("/portal");
    expect(mockRevalidatePath).toHaveBeenCalledWith("/portal/portal-token-1");
  });

  it("disables access without changing the token", async () => {
    mockGetMembershipContext.mockResolvedValue({
      companyId: "company-1",
    });

    const mockMaybeSingle = jest.fn().mockResolvedValue({
      data: { portal_access_token: "existing-token" },
    });
    const mockSelectEqSecond = jest.fn(() => ({ maybeSingle: mockMaybeSingle }));
    const mockSelectEqFirst = jest.fn(() => ({ eq: mockSelectEqSecond }));
    const mockSelect = jest.fn(() => ({ eq: mockSelectEqFirst }));

    const mockUpdateEqSecond = jest.fn().mockResolvedValue({ error: null });
    const mockUpdateEqFirst = jest.fn(() => ({ eq: mockUpdateEqSecond }));
    const mockUpdate = jest.fn(() => ({ eq: mockUpdateEqFirst }));

    mockCreateClient.mockResolvedValue({
      from: jest.fn(() => ({
        select: mockSelect,
        update: mockUpdate,
      })),
    });

    await updatePortalAccessAction(
      buildFormData({
        customerId: "550e8400-e29b-41d4-a716-446655440000",
        intent: "disable",
      }),
    );

    expect(mockUpdate).toHaveBeenCalledWith({ portal_enabled: false });
    expect(mockBuildPortalToken).not.toHaveBeenCalled();
    expect(mockRevalidatePath).toHaveBeenCalledWith("/portal/existing-token");
  });
});
