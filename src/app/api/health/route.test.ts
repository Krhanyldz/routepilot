import { afterEach, describe, expect, it } from "vitest";
import { GET } from "./route";

const originalMode = process.env.ROUTE_DATA_MODE;
const originalTravelpayoutsToken = process.env.TRAVELPAYOUTS_API_TOKEN;

afterEach(() => {
  if (originalMode === undefined) delete process.env.ROUTE_DATA_MODE;
  else process.env.ROUTE_DATA_MODE = originalMode;
  if (originalTravelpayoutsToken === undefined) delete process.env.TRAVELPAYOUTS_API_TOKEN;
  else process.env.TRAVELPAYOUTS_API_TOKEN = originalTravelpayoutsToken;
});

describe("GET /api/health", () => {
  it("returns a non-cacheable readiness report", async () => {
    process.env.ROUTE_DATA_MODE = "demo";
    process.env.TRAVELPAYOUTS_API_TOKEN = "token";
    const response = GET();

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toMatchObject({
      status: "ready",
      mode: "demo",
      checks: { flightInventory: "not-required", requestProtection: "not-required", providerBudget: "not-required", locationData: "ready" },
    });
  });

  it("returns 503 for invalid configuration", async () => {
    process.env.ROUTE_DATA_MODE = "invalid";
    const response = GET();
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ status: "not-ready", mode: "invalid" });
  });
});
