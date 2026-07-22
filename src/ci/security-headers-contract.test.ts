import { describe, expect, it } from "vitest";
import nextConfig from "../../next.config";

describe("application security headers", () => {
  it("removes framework disclosure and applies baseline browser protections", async () => {
    expect(nextConfig.poweredByHeader).toBe(false);
    expect(nextConfig.headers).toBeTypeOf("function");
    const rules = await nextConfig.headers!();
    const headers = new Map(rules[0]?.headers.map(({ key, value }) => [key, value]));

    expect(rules[0]?.source).toBe("/:path*");
    expect(headers.get("Cross-Origin-Opener-Policy")).toBe("same-origin");
    expect(headers.get("Permissions-Policy")).toContain("payment=()");
    expect(headers.get("Referrer-Policy")).toBe("strict-origin-when-cross-origin");
    expect(headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(headers.get("X-Frame-Options")).toBe("DENY");
  });
});
