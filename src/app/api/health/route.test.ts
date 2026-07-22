import { afterEach, describe, expect, it } from "vitest";
import { GET } from "./route";

const originalMode = process.env.ROUTE_DATA_MODE;

afterEach(() => {
  if (originalMode === undefined) delete process.env.ROUTE_DATA_MODE;
  else process.env.ROUTE_DATA_MODE = originalMode;
});

describe("GET /api/health", () => {
  it("returns a non-cacheable readiness report", async () => {
    process.env.ROUTE_DATA_MODE = "demo";
    const response = GET();

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toMatchObject({
      status: "ready",
      mode: "demo",
      checks: { flightInventory: "not-required", requestProtection: "not-required", providerBudget: "not-required" },
    });
  });

  it("returns 503 for invalid configuration", async () => {
    process.env.ROUTE_DATA_MODE = "invalid";
    const response = GET();
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ status: "not-ready", mode: "invalid" });
  });
});
