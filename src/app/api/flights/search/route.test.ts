import { afterEach, describe, expect, it } from "vitest";
import { POST } from "./route";

const originalMode = process.env.ROUTE_DATA_MODE;

afterEach(() => {
  if (originalMode === undefined) delete process.env.ROUTE_DATA_MODE;
  else process.env.ROUTE_DATA_MODE = originalMode;
});

describe("POST /api/flights/search", () => {
  it("returns an explicit unavailable response in demo mode", async () => {
    process.env.ROUTE_DATA_MODE = "demo";
    const response = await POST(request(validBody()));

    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ status: "unavailable", reason: "live-mode-disabled" });
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it("rejects invalid JSON, unsupported content types, and oversized payloads", async () => {
    expect((await POST(request("{"))).status).toBe(400);
    const plainText = new Request("http://routepilot.test/api/flights/search", { method: "POST", body: "x" });
    expect((await POST(plainText)).status).toBe(415);
    expect((await POST(request(JSON.stringify({ padding: "x".repeat(17_000) })))).status).toBe(413);
  });

  it("rejects invalid structured input before checking live configuration", async () => {
    const response = await POST(request(validBody({ originIataCode: "Hamburg" })));
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ status: "failure", reason: "invalid-request" });
  });
});

function request(body: string): Request {
  return new Request("http://routepilot.test/api/flights/search", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-forwarded-for": crypto.randomUUID() },
    body,
  });
}

function validBody(changes: Record<string, unknown> = {}): string {
  return JSON.stringify({
    originIataCode: "HAM",
    destinationIataCode: "AYT",
    departureDate: "2026-09-10",
    adults: 1,
    ...changes,
  });
}
