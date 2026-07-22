import { describe, expect, it } from "vitest";
import { GET } from "./route";

describe("GET /api/locations/search", () => {
  it("returns explicit unavailable state without Travelpayouts configuration", async () => {
    const response = await GET(request("?query=Hamburg&kind=airport"));
    expect(response.status).toBe(503);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("x-request-id")).toMatch(/^[0-9a-f-]{36}$/);
    expect(response.headers.get("traceparent")).toMatch(/^00-[0-9a-f]{32}-[0-9a-f]{16}-00$/);
    expect(response.headers.get("server-timing")).toMatch(/^app;dur=\d+(\.\d+)?$/);
    expect(await response.json()).toMatchObject({ status: "unavailable", reason: "provider-misconfigured" });
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
