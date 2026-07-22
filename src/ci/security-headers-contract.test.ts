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
    expect(headers.get("Cross-Origin-Resource-Policy")).toBe("same-origin");
    expect(headers.get("Content-Security-Policy")).toContain("default-src 'self'");
    expect(headers.get("Content-Security-Policy")).toContain("object-src 'none'");
    expect(headers.get("Content-Security-Policy")).toContain("frame-ancestors 'none'");
    expect(headers.get("Content-Security-Policy")).toContain("connect-src 'self'");
    expect(headers.get("Content-Security-Policy")).not.toContain("https:");
    expect(headers.get("Permissions-Policy")).toContain("payment=()");
    expect(headers.get("Referrer-Policy")).toBe("strict-origin-when-cross-origin");
    expect(headers.get("Strict-Transport-Security")).toBe("max-age=31536000");
    expect(headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(headers.get("X-Frame-Options")).toBe("DENY");
  });
});
