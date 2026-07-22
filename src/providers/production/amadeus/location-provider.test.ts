import { describe, expect, it, vi } from "vitest";
import type { AmadeusAuthorizedClient } from "./client";
import { AmadeusLocationProvider, AmadeusLocationProviderError } from "./location-provider";

const now = () => Date.parse("2026-07-22T12:00:00.000Z");

describe("Amadeus airport and city location provider", () => {
  it("normalizes airports into canonical sourced locations", async () => {
    const get = vi.fn().mockResolvedValue(response([airport()]));
    const provider = new AmadeusLocationProvider({ get }, now);

    const result = await provider.searchAirports({ query: "HAM", countryCodes: ["DE"], limit: 5 });

    expect(get).toHaveBeenCalledOnce();
    const [path, params] = get.mock.calls[0] as [string, URLSearchParams];
    expect(path).toBe("/v1/reference-data/locations");
    expect(params.get("subType")).toBe("AIRPORT");
    expect(params.get("countryCode")).toBe("DE");
    expect(result).toEqual([expect.objectContaining({
      id: "loc:airport:de:ham",
      type: "airport",
      iataCode: "HAM",
      city: "HAMBURG",
      countryCode: "DE",
      timeZone: "Europe/Berlin",
      lastUpdatedAt: "2026-07-22T12:00:00.000Z",
      sources: [{
        sourceId: "amadeus-airport-city-search",
        sourceRecordId: "AHAM",
        sourceType: "aggregator",
        retrievedAt: "2026-07-22T12:00:00.000Z",
      }],
    })]);
  });

  it("searches cities and airports and keeps their canonical identities separate", async () => {
    const client: AmadeusAuthorizedClient = { get: vi.fn().mockResolvedValue(response([city(), airport()])) };
    const result = await new AmadeusLocationProvider(client, now).geocode({ query: "HAM" });

    expect(result.map(({ id }) => id)).toEqual(["loc:city:de:ham", "loc:airport:de:ham"]);
  });

  it("searches each requested country and deduplicates provider records", async () => {
    const get = vi.fn().mockResolvedValue(response([airport()]));
    const result = await new AmadeusLocationProvider({ get }, now).searchAirports({
      query: "HAM",
      countryCodes: ["DE", "NL", "DE"],
    });

    expect(get).toHaveBeenCalledTimes(2);
    expect(result).toHaveLength(1);
  });

  it("rejects invalid input and malformed provider records", async () => {
    const get = vi.fn().mockResolvedValue(response([{ ...airport(), geoCode: {} }]));
    const provider = new AmadeusLocationProvider({ get }, now);

    await expect(provider.searchAirports({ query: "x" })).rejects.toMatchObject({ code: "invalid-request" });
    await expect(provider.searchAirports({ query: "HAM" })).rejects.toBeInstanceOf(AmadeusLocationProviderError);
  });
});

function response(data: unknown[]): unknown {
  return { data };
}

function airport(): Record<string, unknown> {
  return {
    type: "location",
    subType: "AIRPORT",
    name: "HAMBURG AIRPORT",
    detailedName: "HAMBURG/DE:HAMBURG AIRPORT",
    id: "AHAM",
    iataCode: "HAM",
    geoCode: { latitude: 53.6304, longitude: 9.9882 },
    address: { cityName: "HAMBURG", countryCode: "DE" },
  };
}

function city(): Record<string, unknown> {
  return {
    type: "location",
    subType: "CITY",
    name: "HAMBURG",
    detailedName: "HAMBURG/DE",
    id: "CHAM",
    iataCode: "HAM",
    geoCode: { latitude: 53.5511, longitude: 9.9937 },
    address: { cityName: "HAMBURG", countryCode: "DE" },
  };
}
