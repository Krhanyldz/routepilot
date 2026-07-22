import { beforeEach, describe, expect, it, vi } from "vitest";
import type { RequestRateLimiter } from "./rate-limit";
import { createProviderBudget, ProviderBudgetConfigurationError } from "./provider-budget";

const limiter: RequestRateLimiter = { consume: vi.fn().mockResolvedValue({ allowed: true, retryAfterSeconds: 1 }) };
const factories = { memory: vi.fn(() => limiter), upstash: vi.fn(() => limiter) };

describe("provider request budget", () => {
  beforeEach(() => vi.clearAllMocks());

  it("paces test traffic at one request per 100ms", async () => {
    const budget = createProviderBudget({ AMADEUS_ENVIRONMENT: "test" }, factories);
    expect(factories.memory).toHaveBeenCalledWith(1, 100);
    await expect(budget.consume("flight-offers")).resolves.toMatchObject({ allowed: true });
    expect(limiter.consume).toHaveBeenCalledWith("flight-offers");
  });

  it("requires an explicit bounded production request budget", () => {
    expect(() => createProviderBudget({ AMADEUS_ENVIRONMENT: "production" }, factories))
      .toThrow("requires PROVIDER_MAX_REQUESTS_PER_SECOND");
    for (const value of ["0", "41", "1.5", "invalid"]) {
      expect(() => createProviderBudget({
        AMADEUS_ENVIRONMENT: "production",
        PROVIDER_MAX_REQUESTS_PER_SECOND: value,
        PROVIDER_MAX_REQUESTS_PER_DAY: "1000",
      }, factories)).toThrow("integer from 1 to 40");
    }
    expect(() => createProviderBudget({
      AMADEUS_ENVIRONMENT: "production",
      PROVIDER_MAX_REQUESTS_PER_SECOND: "20",
    }, factories)).toThrow("requires PROVIDER_MAX_REQUESTS_PER_DAY");
    for (const value of ["0", "1.5", "invalid"]) {
      expect(() => createProviderBudget({
        AMADEUS_ENVIRONMENT: "production",
        PROVIDER_MAX_REQUESTS_PER_SECOND: "20",
        PROVIDER_MAX_REQUESTS_PER_DAY: value,
      }, factories)).toThrow("positive integer");
    }
  });

  it("uses one distributed provider budget across production instances", () => {
    createProviderBudget({
      NODE_ENV: "production",
      ROUTE_DATA_MODE: "live",
      AMADEUS_ENVIRONMENT: "production",
      PROVIDER_MAX_REQUESTS_PER_SECOND: "20",
      PROVIDER_MAX_REQUESTS_PER_DAY: "25000",
      RATE_LIMIT_BACKEND: "upstash",
      UPSTASH_REDIS_REST_URL: "https://redis.example",
      UPSTASH_REDIS_REST_TOKEN: "token",
    }, factories);
    expect(factories.upstash).toHaveBeenNthCalledWith(1, "https://redis.example", "token", {
      maximumRequests: 20,
      window: "1 s",
      prefix: "routepilot:amadeus-throughput",
    });
    expect(factories.upstash).toHaveBeenNthCalledWith(2, "https://redis.example", "token", {
      maximumRequests: 25000,
      window: "86400 s",
      prefix: "routepilot:amadeus-daily-budget",
    });
  });

  it("stops before the upstream call when either throughput or daily budget is exhausted", async () => {
    const throughput = { consume: vi.fn().mockResolvedValue({ allowed: true, retryAfterSeconds: 1 }) };
    const daily = { consume: vi.fn().mockResolvedValue({ allowed: false, retryAfterSeconds: 600 }) };
    const upstash = vi.fn()
      .mockReturnValueOnce(throughput)
      .mockReturnValueOnce(daily);
    const budget = createProviderBudget({
      AMADEUS_ENVIRONMENT: "production",
      PROVIDER_MAX_REQUESTS_PER_SECOND: "20",
      PROVIDER_MAX_REQUESTS_PER_DAY: "25000",
      RATE_LIMIT_BACKEND: "upstash",
      UPSTASH_REDIS_REST_URL: "https://redis.example",
      UPSTASH_REDIS_REST_TOKEN: "token",
    }, { memory: factories.memory, upstash });

    await expect(budget.consume("flight-offers")).resolves.toEqual({ allowed: false, retryAfterSeconds: 600 });
    expect(throughput.consume).toHaveBeenCalledOnce();
    expect(daily.consume).toHaveBeenCalledOnce();
  });

  it("fails closed when production live traffic is not distributed", () => {
    expect(() => createProviderBudget({
      NODE_ENV: "production",
      ROUTE_DATA_MODE: "live",
      AMADEUS_ENVIRONMENT: "test",
    }, factories)).toThrow(ProviderBudgetConfigurationError);
  });
});
