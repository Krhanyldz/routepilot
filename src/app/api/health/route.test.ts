import { afterEach, describe, expect, it } from "vitest";
import { GET } from "./route";

const originalTravelpayoutsToken = process.env.TRAVELPAYOUTS_API_TOKEN;

afterEach(() => {
  if (originalTravelpayoutsToken === undefined) delete process.env.TRAVELPAYOUTS_API_TOKEN;
  else process.env.TRAVELPAYOUTS_API_TOKEN = originalTravelpayoutsToken;
});

describe("GET /api/health", () => {
  it("returns a non-cacheable readiness report", async () => {
    process.env.TRAVELPAYOUTS_API_TOKEN = "token";
    const response = GET();

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toMatchObject({
      status: "ready",
      checks: { flightInventory: "unavailable", requestProtection: "ready", locationData: "ready" },
    });
  });

  it("returns 503 for invalid configuration", async () => {
    delete process.env.TRAVELPAYOUTS_API_TOKEN;
    const response = GET();
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ status: "not-ready", checks: { locationData: "misconfigured" } });
  });
});
