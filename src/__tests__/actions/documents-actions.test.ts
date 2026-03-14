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

import { createDocumentAction } from "@/app/(workspace)/documents/actions";

function buildFormData(values: Record<string, string>) {
  const formData = new FormData();
  Object.entries(values).forEach(([key, value]) => formData.set(key, value));
  return formData;
}

describe("createDocumentAction", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("requires at least one linked entity", async () => {
    mockGetMembershipContext.mockResolvedValue({
      companyId: "company-1",
      userId: "user-1",
    });

    const result = await createDocumentAction(
      {},
      buildFormData({
        bucketPath: "company-1/invoices/INV-3001.pdf",
        kind: "invoice_pdf",
      }),
    );

    expect(result).toEqual({
      error: "Link the document to a customer, invoice, or dispute.",
    });
  });

  it("inserts the document record for valid input", async () => {
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

    await createDocumentAction(
      {},
      buildFormData({
        bucketPath: "company-1/invoices/INV-3001.pdf",
        kind: "invoice_pdf",
        invoiceId: "550e8400-e29b-41d4-a716-446655440000",
      }),
    );

    expect(mockInsert).toHaveBeenCalledWith({
      company_id: "company-1",
      customer_id: null,
      invoice_id: "550e8400-e29b-41d4-a716-446655440000",
      dispute_id: null,
      bucket_path: "company-1/invoices/INV-3001.pdf",
      kind: "invoice_pdf",
      uploaded_by: "user-1",
    });
    expect(mockRevalidatePath).toHaveBeenCalledWith("/documents");
    expect(mockRedirect).toHaveBeenCalledWith("/documents");
  });
});
