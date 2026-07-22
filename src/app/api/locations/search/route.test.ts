import { afterEach, describe, expect, it } from "vitest";
import { GET } from "./route";

const originalMode = process.env.ROUTE_DATA_MODE;

afterEach(() => {
  if (originalMode === undefined) delete process.env.ROUTE_DATA_MODE;
  else process.env.ROUTE_DATA_MODE = originalMode;
});

describe("GET /api/locations/search", () => {
  it("returns explicit unavailable state in demo mode", async () => {
    process.env.ROUTE_DATA_MODE = "demo";
    const response = await GET(request("?query=Hamburg&kind=airport"));
    expect(response.status).toBe(503);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toMatchObject({ status: "unavailable", reason: "live-mode-disabled" });
  });

  it("rejects invalid and excessive query strings", async () => {
    expect((await GET(request("?query=H"))).status).toBe(400);
    expect((await GET(request(`?query=HAM&padding=${"x".repeat(2_100)}`))).status).toBe(414);
  });
});

function request(query: string): Request {
  return new Request(`https://routepilot.test/api/locations/search${query}`, {
    headers: { "x-forwarded-for": crypto.randomUUID() },
  });
}
