import { describe, expect, it } from "vitest";
import { buildCanonicalLocationId, createCanonicalLocation, type CanonicalLocation } from "@/domain/location";
import type { NearbyLocationSearchProvider } from "@/providers/location-interfaces";
import { discoverCandidateDepartures, type GroundPositioningEstimator } from "./candidate-departures";
import { deduplicateCanonicalLocations } from "./location-deduplication";

const retrievedAt = "2026-07-22T00:00:00.000Z";
const origin = location("city", "origin", 0, 0);
const nearAirport = location("airport", "naa", 0, 0.5, "NAA");
const farAirport = location("airport", "faa", 0, 3, "FAA");
const station = location("railway-station", "sta", 0, 0.25, undefined, "STA");
const catalog = [nearAirport, farAirport, station];
const provider: NearbyLocationSearchProvider = {
  id: "fixture-provider",
  async searchNearby() { return catalog; },
};
const estimator: GroundPositioningEstimator = {
  async estimate(_origin, destination) {
    return { durationMinutes: destination.id === farAirport.id ? 240 : 30, cost: destination.id === nearAirport.id ? 10 : 5, currency: "EUR" };
  },
};

describe("candidate departure discovery", () => {
  it("filters worldwide candidates by radius and mode", async () => {
    const candidates = await discoverCandidateDepartures(
      { origin, radiusKm: 100, allowedModes: ["flight"] },
      { nearbyProvider: provider, positioningEstimator: estimator, sourcePrecedence: [provider.id] },
    );
    expect(candidates.map(({ location: candidate }) => candidate.iataCode)).toEqual(["NAA"]);
  });

  it("filters by maximum ground travel duration", async () => {
    const candidates = await discoverCandidateDepartures(
      { origin, radiusKm: 500, maximumGroundTravelDurationMinutes: 60, allowedModes: ["flight"] },
      { nearbyProvider: provider, positioningEstimator: estimator, sourcePrecedence: [provider.id] },
    );
    expect(candidates.map(({ location: candidate }) => candidate.iataCode)).toEqual(["NAA"]);
  });

  it("supports station candidates without introducing bus transport", async () => {
    const candidates = await discoverCandidateDepartures(
      { origin, radiusKm: 100, allowedModes: ["train"] },
      { nearbyProvider: provider, positioningEstimator: estimator, sourcePrecedence: [provider.id] },
    );
    expect(candidates).toEqual([expect.objectContaining({ mode: "train", location: expect.objectContaining({ stationCode: "STA" }) })]);
  });

  it("deduplicates strong canonical codes using source precedence", () => {
    const duplicate = createCanonicalLocation({
      ...nearAirport,
      id: "loc:airport:zz:duplicate",
      name: "Alternate Name",
      sources: [{ sourceId: "secondary", sourceRecordId: "copy", sourceType: "aggregator", retrievedAt }],
    });
    const merged = deduplicateCanonicalLocations([duplicate, nearAirport], { sourcePrecedence: [provider.id, "secondary"] });
    expect(merged).toHaveLength(1);
    expect(merged[0]).toMatchObject({ id: nearAirport.id, iataCode: "NAA" });
    expect(merged[0].sources).toHaveLength(2);
  });

  it("generates stable provider-independent IDs and validates coordinates", () => {
    const input = { type: "airport" as const, countryCode: "ZZ", primaryCodeOrSlug: "NAA" };
    expect(buildCanonicalLocationId(input)).toBe("loc:airport:zz:naa");
    expect(() => createCanonicalLocation({ ...nearAirport, latitude: 91 })).toThrow("Invalid latitude");
    expect(nearAirport.sources[0]).toMatchObject({ sourceId: provider.id, retrievedAt });
  });
});

function location(
  type: CanonicalLocation["type"],
  code: string,
  latitude: number,
  longitude: number,
  iataCode?: string,
  stationCode?: string,
): CanonicalLocation {
  return createCanonicalLocation({
    id: buildCanonicalLocationId({ type, countryCode: "ZZ", primaryCodeOrSlug: code }),
    name: code,
    city: code,
    countryCode: "ZZ",
    latitude,
    longitude,
    timeZone: "Etc/UTC",
    type,
    ...(iataCode ? { iataCode } : {}),
    ...(stationCode ? { stationCode } : {}),
    aliases: [],
    sources: [{ sourceId: "fixture-provider", sourceRecordId: code, sourceType: "aggregator", retrievedAt }],
    lastUpdatedAt: retrievedAt,
  });
}
