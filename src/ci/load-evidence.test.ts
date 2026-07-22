import { describe, expect, it } from "vitest";
import { parseLoadConfiguration, summarizeLoadResults } from "../../scripts/lib/load-evidence.mjs";

describe("preview load evidence", () => {
  it("refuses remote targets without explicit non-production acknowledgement", () => {
    expect(() => parseLoadConfiguration({}, "https://routepilot.example"))
      .toThrow("ROUTEPILOT_LOAD_ACK=preview-only");
    expect(parseLoadConfiguration({ ROUTEPILOT_LOAD_ACK: "preview-only" }, "https://preview.example"))
      .toMatchObject({ requests: 200, concurrency: 10, maximumP95Ms: 2000, maximumErrorRate: 0.01 });
  });

  it("bounds request volume, concurrency, latency, and error thresholds", () => {
    for (const environment of [
      { LOAD_REQUESTS: "10001" },
      { LOAD_CONCURRENCY: "101" },
      { LOAD_MAX_P95_MS: "0" },
      { LOAD_MAX_ERROR_RATE: "1.1" },
    ]) {
      expect(() => parseLoadConfiguration(environment, "http://127.0.0.1:3000")).toThrow();
    }
  });

  it("computes deterministic percentiles and fails closed on either threshold", () => {
    const configuration = {
      maximumP95Ms: 100,
      maximumErrorRate: 0.1,
    };
    expect(summarizeLoadResults([10, 20, 30, 40, 200], 0, configuration)).toEqual({
      requests: 5, failures: 0, errorRate: 0, p50Ms: 30, p95Ms: 200, p99Ms: 200, passed: false,
    });
    expect(summarizeLoadResults([10, 20, 30, 40, 50], 1, configuration).passed).toBe(false);
    expect(summarizeLoadResults([10, 20, 30, 40, 50], 0, configuration).passed).toBe(true);
  });
});
