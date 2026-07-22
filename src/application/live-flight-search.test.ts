import { describe, expect, it } from "vitest";
import { LiveFlightProviderError, type LiveFlightSearchProvider } from "@/providers/live-flight";
import { executeLiveFlightSearch, parseLiveFlightSearchQuery } from "./live-flight-search";

const query = { originIataCode: "HAM", destinationIataCode: "AYT", departureDate: "2026-09-10", adults: 1 };

describe("live flight search application", () => {
  it("returns an honest unavailable state when the provider capability is unavailable", async () => {
    await expect(executeLiveFlightSearch(query, { configured: false, provider: null })).resolves.toEqual({
      status: "unavailable", reason: "provider-capability-unavailable",
    });
  });

  it("does not replace a provider failure with demo data", async () => {
    const provider = failingProvider(new LiveFlightProviderError("timeout", "private upstream message", true));
    await expect(executeLiveFlightSearch(query, { configured: true, provider })).resolves.toEqual({
      status: "failure", reason: "timeout",
    });
  });

  it("passes through normalized successful evidence", async () => {
    const provider: LiveFlightSearchProvider = {
      id: "test-provider",
      async searchFlights() {
        return { providerId: this.id, fetchedAt: "2026-07-22T00:00:00.000Z", offers: [], warnings: [], coverage: "provider-limited" };
      },
    };
    await expect(executeLiveFlightSearch(query, { configured: true, provider })).resolves.toMatchObject({
      status: "success", result: { providerId: "test-provider" },
    });
  });

  it("strictly parses fields and rejects invalid formats", () => {
    expect(parseLiveFlightSearchQuery({ ...query, nonStop: true, maxResults: 10 })).toMatchObject(query);
    expect(() => parseLiveFlightSearchQuery({ ...query, unknown: true })).toThrow("unsupported fields");
    expect(() => parseLiveFlightSearchQuery({ ...query, originIataCode: "Hamburg" })).toThrow("IATA");
    expect(() => parseLiveFlightSearchQuery({ ...query, returnDate: "2026-01-01" })).toThrow("Return date");
  });
});

function failingProvider(error: Error): LiveFlightSearchProvider {
  return { id: "failing-provider", async searchFlights() { throw error; } };
}
