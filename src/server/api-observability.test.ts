import { describe, expect, it, vi } from "vitest";
import { observeApiRequest } from "./api-observability";

describe("API observability", () => {
  it("emits one bounded, structured completion event", () => {
    const write = vi.fn();
    const times = [100, 112.345];
    const observation = observeApiRequest("flight-search", "POST", "request-1", {
      now: () => times.shift() ?? 112.345,
      timestamp: () => new Date("2026-07-22T16:00:00.000Z"),
      write,
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
      status: 503,
      outcome: "provider-unavailable",
      durationMs: 12.35,
    });
    expect(JSON.stringify(write.mock.calls[0][0])).not.toContain("HAM");
  });

  it("classifies non-server responses as informational", () => {
    const write = vi.fn();
    const observation = observeApiRequest("location-search", "GET", "request-2", {
      now: () => 10,
      write,
    });
    observation.complete(429, "request-rate-limit");
    expect(write.mock.calls[0][0]).toMatchObject({ level: "info", status: 429 });
  });
});
