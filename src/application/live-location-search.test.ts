import { describe, expect, it, vi } from "vitest";
import type { AirportSearchProvider, GeocodingProvider } from "@/providers/location-interfaces";
import { AmadeusLocationProviderError } from "@/providers/production/amadeus";
import { executeLiveLocationSearch, parseLiveLocationSearchRequest } from "./live-location-search";

const provider: AirportSearchProvider & GeocodingProvider = {
  id: "test-locations",
  searchAirports: vi.fn().mockResolvedValue([]),
  geocode: vi.fn().mockResolvedValue([]),
};

describe("live location search application boundary", () => {
  it("parses strict query parameters", () => {
    expect(parseLiveLocationSearchRequest(new URLSearchParams({
      query: "Hamburg", kind: "airport", countryCodes: "DE,NL", limit: "5",
    }))).toEqual({ query: "Hamburg", kind: "airport", countryCodes: ["DE", "NL"], limit: 5 });
    expect(() => parseLiveLocationSearchRequest(new URLSearchParams({ query: "H", extra: "x" }))).toThrow("Unsupported");
  });

  it("keeps disabled and misconfigured live modes explicit", async () => {
    const request = { query: "HAM", kind: "airport" as const, limit: 5 };
    await expect(executeLiveLocationSearch(request, { configured: false, provider: null }))
      .resolves.toEqual({ status: "unavailable", reason: "live-mode-disabled" });
    await expect(executeLiveLocationSearch(request, { configured: true, provider: null }))
      .resolves.toEqual({ status: "unavailable", reason: "provider-misconfigured" });
  });

  it("maps provider failures without exposing messages", async () => {
    const failing = {
      ...provider,
      searchAirports: vi.fn().mockRejectedValue(new AmadeusLocationProviderError("timeout", "secret upstream detail", true)),
    };
    await expect(executeLiveLocationSearch(
      { query: "HAM", kind: "airport", limit: 5 }, { configured: true, provider: failing },
    )).resolves.toEqual({ status: "failure", reason: "timeout" });
  });
});
