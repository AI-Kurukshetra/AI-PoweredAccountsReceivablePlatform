import { buildPortalUrl, getPortalBaseUrl } from "@/lib/portal";

describe("portal helpers", () => {
  const originalSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;

  afterEach(() => {
    if (originalSiteUrl === undefined) {
      delete process.env.NEXT_PUBLIC_SITE_URL;
    } else {
      process.env.NEXT_PUBLIC_SITE_URL = originalSiteUrl;
    }
  });

  it("falls back to localhost when no site url is configured", () => {
    delete process.env.NEXT_PUBLIC_SITE_URL;

    expect(getPortalBaseUrl()).toBe("http://localhost:3000");
    expect(buildPortalUrl("abc123")).toBe("http://localhost:3000/portal/abc123");
  });

  it("uses the configured site url when present", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://finance.example.com";

    expect(getPortalBaseUrl()).toBe("https://finance.example.com");
    expect(buildPortalUrl("xyz789")).toBe("https://finance.example.com/portal/xyz789");
  });
});
