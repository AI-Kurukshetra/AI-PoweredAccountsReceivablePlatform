const mockGetMembershipContext = jest.fn();
const mockCreateAdminClient = jest.fn();
const mockRevalidatePath = jest.fn();
const mockHeaders = jest.fn();

jest.mock("next/cache", () => ({
  revalidatePath: (...args: unknown[]) => mockRevalidatePath(...args),
}));

jest.mock("next/headers", () => ({
  headers: (...args: unknown[]) => mockHeaders(...args),
}));

jest.mock("@/lib/company", () => ({
  getMembershipContext: (...args: unknown[]) => mockGetMembershipContext(...args),
}));

jest.mock("@/lib/supabase/admin", () => ({
  createAdminClient: (...args: unknown[]) => mockCreateAdminClient(...args),
}));

import {
  createMemberAction,
  updateMemberRoleAction,
} from "@/app/(workspace)/access/actions";

function buildFormData(values: Record<string, string>) {
  const formData = new FormData();
  Object.entries(values).forEach(([key, value]) => formData.set(key, value));
  return formData;
}

describe("updateMemberRoleAction", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("does nothing for members without access-management rights", async () => {
    mockGetMembershipContext.mockResolvedValue({
      companyId: "company-1",
      role: "viewer",
      userId: "user-1",
    });

    await updateMemberRoleAction(
      buildFormData({
        memberId: "550e8400-e29b-41d4-a716-446655440000",
        role: "collector",
      }),
    );

    expect(mockCreateAdminClient).not.toHaveBeenCalled();
  });

  it("updates a non-owner member role for admins", async () => {
    mockGetMembershipContext.mockResolvedValue({
      companyId: "company-1",
      role: "admin",
      userId: "user-1",
    });

    const mockMaybeSingle = jest.fn().mockResolvedValue({
      data: {
        id: "member-2",
        role: "viewer",
        user_id: "user-2",
      },
    });
    const mockSelectEqSecond = jest.fn(() => ({ maybeSingle: mockMaybeSingle }));
    const mockSelectEqFirst = jest.fn(() => ({ eq: mockSelectEqSecond }));
    const mockSelect = jest.fn(() => ({ eq: mockSelectEqFirst }));

    const mockUpdateEqSecond = jest.fn().mockResolvedValue({ error: null });
    const mockUpdateEqFirst = jest.fn(() => ({ eq: mockUpdateEqSecond }));
    const mockUpdate = jest.fn(() => ({ eq: mockUpdateEqFirst }));

    mockCreateAdminClient.mockReturnValue({
      from: jest.fn(() => ({
        select: mockSelect,
        update: mockUpdate,
      })),
    });

    await updateMemberRoleAction(
      buildFormData({
        memberId: "550e8400-e29b-41d4-a716-446655440000",
        role: "collector",
      }),
    );

    expect(mockUpdate).toHaveBeenCalledWith({ role: "collector" });
    expect(mockRevalidatePath).toHaveBeenCalledWith("/access");
  });
});

describe("createMemberAction", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockHeaders.mockResolvedValue({
      get: jest.fn(() => "http://localhost:3000"),
    });
  });

  it("adds an existing registered user to the company", async () => {
    mockGetMembershipContext.mockResolvedValue({
      companyId: "company-1",
      role: "owner",
      userId: "user-1",
    });

    const mockProfileMaybeSingle = jest.fn().mockResolvedValue({
      data: {
        id: "user-2",
        email: "priya@company.com",
      },
    });
    const mockMembershipMaybeSingle = jest.fn().mockResolvedValue({
      data: null,
    });
    const mockInsert = jest.fn().mockResolvedValue({ error: null });
    const mockInviteUserByEmail = jest.fn();

    mockCreateAdminClient.mockReturnValue({
      auth: {
        admin: {
          inviteUserByEmail: mockInviteUserByEmail,
        },
      },
      from: jest.fn((table: string) => {
        if (table === "profiles") {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                maybeSingle: mockProfileMaybeSingle,
              })),
            })),
          };
        }

        if (table === "company_members") {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                limit: jest.fn(() => ({
                  maybeSingle: mockMembershipMaybeSingle,
                })),
              })),
            })),
            insert: mockInsert,
          };
        }

        return {};
      }),
    });

    const result = await createMemberAction(
      {},
      buildFormData({
        fullName: "Priya Patel",
        email: "priya@company.com",
        role: "finance_manager",
      }),
    );

    expect(result).toEqual({
      success: "Added priya@company.com as finance manager.",
    });
    expect(mockInsert).toHaveBeenCalledWith({
      company_id: "company-1",
      user_id: "user-2",
      role: "finance_manager",
    });
    expect(mockInviteUserByEmail).not.toHaveBeenCalled();
    expect(mockRevalidatePath).toHaveBeenCalledWith("/access");
  });

  it("rejects member creation when the full name is blank", async () => {
    mockGetMembershipContext.mockResolvedValue({
      companyId: "company-1",
      role: "owner",
      userId: "user-1",
    });

    const result = await createMemberAction(
      {},
      buildFormData({
        fullName: "",
        email: "priya@company.com",
        role: "finance_manager",
      }),
    );

    expect(result).toEqual({
      error: "Full name is required.",
    });
    expect(mockCreateAdminClient).not.toHaveBeenCalled();
  });

  it("invites a new user and preassigns the selected role", async () => {
    mockGetMembershipContext.mockResolvedValue({
      companyId: "company-1",
      role: "admin",
      userId: "user-1",
    });

    const mockProfileMaybeSingle = jest.fn().mockResolvedValue({
      data: null,
    });
    const mockMembershipMaybeSingle = jest.fn().mockResolvedValue({
      data: null,
    });
    const mockInsert = jest.fn().mockResolvedValue({ error: null });
    const mockInviteUserByEmail = jest.fn().mockResolvedValue({
      data: {
        user: {
          id: "user-3",
        },
      },
      error: null,
    });

    mockCreateAdminClient.mockReturnValue({
      auth: {
        admin: {
          inviteUserByEmail: mockInviteUserByEmail,
        },
      },
      from: jest.fn((table: string) => {
        if (table === "profiles") {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                maybeSingle: mockProfileMaybeSingle,
              })),
            })),
          };
        }

        if (table === "company_members") {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                limit: jest.fn(() => ({
                  maybeSingle: mockMembershipMaybeSingle,
                })),
              })),
            })),
            insert: mockInsert,
          };
        }

        return {};
      }),
    });

    const result = await createMemberAction(
      {},
      buildFormData({
        fullName: "Nina Roy",
        email: "nina@company.com",
        role: "collector",
      }),
    );

    expect(result).toEqual({
      success:
        "Invited nina@company.com as collector. They can join after accepting the email invite.",
    });
    expect(mockInviteUserByEmail).toHaveBeenCalledWith("nina@company.com", {
      data: { full_name: "Nina Roy" },
      redirectTo: "http://localhost:3000/auth/confirm?next=/dashboard",
    });
    expect(mockInsert).toHaveBeenCalledWith({
      company_id: "company-1",
      user_id: "user-3",
      role: "collector",
    });
    expect(mockRevalidatePath).toHaveBeenCalledWith("/access");
  });
});
