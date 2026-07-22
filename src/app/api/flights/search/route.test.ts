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
    expect(response.headers.get("x-request-id")).toMatch(/^[0-9a-f-]{36}$/);
    expect(response.headers.get("traceparent")).toMatch(/^00-[0-9a-f]{32}-[0-9a-f]{16}-00$/);
    expect(response.headers.get("server-timing")).toMatch(/^app;dur=\d+(\.\d+)?$/);
  });

  it("continues a valid incoming trace without reflecting its parent span", async () => {
    process.env.ROUTE_DATA_MODE = "demo";
    const traceId = "1".repeat(32);
    const response = await POST(request(validBody(), {
      traceparent: `00-${traceId}-${"2".repeat(16)}-01`,
    }));
    expect(response.headers.get("traceparent")).toMatch(new RegExp(`^00-${traceId}-(?!${"2".repeat(16)})[0-9a-f]{16}-01$`));
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

function request(body: string, extraHeaders: Record<string, string> = {}): Request {
  return new Request("http://routepilot.test/api/flights/search", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-forwarded-for": crypto.randomUUID(), ...extraHeaders },
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
