import { describe, expect, it, vi } from "vitest";
import { createTraceContext, observeApiRequest } from "./api-observability";

describe("API observability", () => {
  it("emits one bounded, structured completion event", () => {
    const write = vi.fn();
    const times = [100, 112.345];
    const observation = observeApiRequest("flight-search", "POST", "request-1", {
      now: () => times.shift() ?? 112.345,
      timestamp: () => new Date("2026-07-22T16:00:00.000Z"),
      write,
      trace: createTraceContext(null, (length) => "a".repeat(length)),
    });

    observation.complete(503, "provider-unavailable");
    observation.complete(200, "success");

    expect(write).toHaveBeenCalledOnce();
    expect(write).toHaveBeenCalledWith({
      timestamp: "2026-07-22T16:00:00.000Z",
      level: "error",
      event: "api.request.completed",
      route: "flight-search",
      method: "POST",
      requestId: "request-1",
      traceId: "a".repeat(32),
      spanId: "a".repeat(16),
      status: 503,
      outcome: "provider-unavailable",
      durationMs: 12.35,
    });
    expect(JSON.stringify(write.mock.calls[0][0])).not.toContain("HAM");
  });

  it("continues valid W3C traces with a new span and rejects malformed parents", () => {
    const parent = "00-11111111111111111111111111111111-2222222222222222-01";
    expect(createTraceContext(parent, (length) => "3".repeat(length))).toEqual({
      traceId: "1".repeat(32),
      spanId: "3".repeat(16),
      flags: "01",
      traceparent: `00-${"1".repeat(32)}-${"3".repeat(16)}-01`,
    });
    expect(createTraceContext("00-invalid", (length) => "4".repeat(length)).traceId).toBe("4".repeat(32));
  });

  it("rejects unsafe trace ID generators", () => {
    expect(() => createTraceContext(null, (length) => "0".repeat(length))).toThrow("non-zero lowercase hexadecimal");
    expect(() => createTraceContext(null, (length) => "Z".repeat(length))).toThrow("non-zero lowercase hexadecimal");
  });

  it("classifies non-server responses as informational", () => {
    const write = vi.fn();
    const observation = observeApiRequest("location-search", "GET", "request-2", {
      now: () => 10,
      write,
      trace: createTraceContext(null, (length) => "b".repeat(length)),
    });
    observation.complete(429, "request-rate-limit");
    expect(write.mock.calls[0][0]).toMatchObject({ level: "info", status: 429 });
  });
});
