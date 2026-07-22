import { describe, expect, it, vi } from "vitest";
import type { RequestRateLimiter } from "./rate-limit";
import { createRequestProtection, RequestProtectionConfigurationError } from "./request-protection";

const limiter: RequestRateLimiter = { consume: vi.fn() };
const factories = { memory: vi.fn(() => limiter), upstash: vi.fn(() => limiter) };

describe("request protection configuration", () => {
  it("uses isolated memory limiting outside production live mode", () => {
    const protection = createRequestProtection({ NODE_ENV: "test", ROUTE_DATA_MODE: "demo" }, factories);
    expect(protection.limiter).toBe(limiter);
    expect(protection.identify(request("203.0.113.10"))).toBe("203.0.113.10");
  });

  it("requires distributed limiting for production live inventory", () => {
    expect(() => createRequestProtection({ NODE_ENV: "production", ROUTE_DATA_MODE: "live" }, factories))
      .toThrow(RequestProtectionConfigurationError);
  });

  it("configures Upstash and hashes client identifiers", () => {
    const environment = {
      NODE_ENV: "production",
      ROUTE_DATA_MODE: "live",
      RATE_LIMIT_BACKEND: "upstash",
      UPSTASH_REDIS_REST_URL: "https://redis.example",
      UPSTASH_REDIS_REST_TOKEN: "token",
      RATE_LIMIT_KEY_SECRET: "a-secure-secret-that-is-at-least-32-characters",
    };
    const protection = createRequestProtection(environment, factories);

    expect(factories.upstash).toHaveBeenCalledWith("https://redis.example", "token");
    expect(protection.identify(request("203.0.113.10"))).toMatch(/^[a-f0-9]{64}$/);
    expect(protection.identify(request("203.0.113.10"))).toBe(protection.identify(request("203.0.113.10")));
    expect(protection.identify(request("203.0.113.10"))).not.toContain("203.0.113.10");
  });

  it("rejects partial or weak distributed configuration", () => {
    expect(() => createRequestProtection({ RATE_LIMIT_BACKEND: "upstash" }, factories)).toThrow("UPSTASH_REDIS_REST_URL");
    expect(() => createRequestProtection({
      RATE_LIMIT_BACKEND: "upstash",
      UPSTASH_REDIS_REST_URL: "https://redis.example",
      UPSTASH_REDIS_REST_TOKEN: "token",
      RATE_LIMIT_KEY_SECRET: "short",
    }, factories)).toThrow("at least 32 characters");
  });
});

function request(forwardedFor: string): Request {
  return new Request("https://routepilot.test", { headers: { "x-forwarded-for": `${forwardedFor}, 198.51.100.1` } });
}
