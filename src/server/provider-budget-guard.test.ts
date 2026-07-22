import { describe, expect, it, vi } from "vitest";
import { ProviderBudgetConfigurationError, type ProviderBudget } from "./provider-budget";
import { guardProviderRequest } from "./provider-budget-guard";

describe("provider budget guard", () => {
  it("returns deterministic allowed and exhausted outcomes", async () => {
    const consume = vi.fn()
      .mockResolvedValueOnce({ allowed: true, retryAfterSeconds: 1 })
      .mockResolvedValueOnce({ allowed: false, retryAfterSeconds: 2 });
    const budget: ProviderBudget = { consume };

    await expect(guardProviderRequest(budget, "flight-offers")).resolves.toEqual({ status: "allowed" });
    await expect(guardProviderRequest(budget, "flight-offers")).resolves.toEqual({
      status: "rejected",
      httpStatus: 429,
      reason: "provider-budget-exhausted",
      retryAfterSeconds: 2,
    });
  });

  it("distinguishes configuration from runtime budget failures", async () => {
    await expect(guardProviderRequest({
      consume: vi.fn().mockRejectedValue(new ProviderBudgetConfigurationError("bad config")),
    }, "locations")).resolves.toMatchObject({ reason: "provider-budget-misconfigured" });
    await expect(guardProviderRequest({
      consume: vi.fn().mockRejectedValue(new Error("redis offline")),
    }, "locations")).resolves.toMatchObject({ reason: "provider-budget-unavailable" });
  });
});
