import { describe, expect, it } from "vitest";
import { buildCanonicalLocationId, createCanonicalLocation, type CanonicalLocation } from "@/domain/location";
import { DemoGlobalLocationProvider, demoGlobalLocations } from "@/providers/demo/location-engine";
import type { NearbyLocationSearchProvider } from "@/providers/location-interfaces";
import { discoverCandidateDepartures, type GroundPositioningEstimator } from "./candidate-departures";
import { deduplicateCanonicalLocations } from "./location-deduplication";

const bremen = requiredLocation("loc:city:de:bremen");
const provider = new DemoGlobalLocationProvider();
const estimates: Readonly<Record<string, { durationMinutes: number; cost: number; currency: string }>> = {
  "loc:airport:de:bre": { durationMinutes: 20, cost: 3, currency: "EUR" },
  "loc:airport:de:ham": { durationMinutes: 75, cost: 20, currency: "EUR" },
  "loc:airport:de:haj": { durationMinutes: 90, cost: 24, currency: "EUR" },
  "loc:airport:de:fmo": { durationMinutes: 130, cost: 30, currency: "EUR" },
  "loc:airport:de:dtm": { durationMinutes: 180, cost: 40, currency: "EUR" },
  "loc:airport:nl:ams": { durationMinutes: 240, cost: 55, currency: "EUR" },
  "loc:railway-station:de:debre": { durationMinutes: 8, cost: 0, currency: "EUR" },
  "loc:railway-station:de:deham": { durationMinutes: 65, cost: 0, currency: "EUR" },
  "loc:railway-station:de:dehan": { durationMinutes: 75, cost: 0, currency: "EUR" },
  "loc:railway-station:de:debrv": { durationMinutes: 35, cost: 0, currency: "EUR" },
  "loc:ferry-terminal:de:debrv": { durationMinutes: 60, cost: 10, currency: "EUR" },
};
const positioningEstimator: GroundPositioningEstimator = {
  async estimate(_origin, destination) {
    return estimates[destination.id] ?? null;
  },
};

const dependencies = { nearbyProvider: provider, positioningEstimator, sourcePrecedence: [provider.id] };

describe("global candidate departure discovery", () => {
  it("finds Bremen nearby airports and excludes Amsterdam at 250 km", async () => {
    const candidates = await discoverCandidateDepartures({ origin: bremen, radiusKm: 250, allowedModes: ["flight"] }, dependencies);
    expect(candidates.map(({ location }) => location.iataCode)).toEqual(["BRE", "HAJ", "HAM", "FMO", "DTM"]);
    expect(candidates.some(({ location }) => location.iataCode === "AMS")).toBe(false);
  });

  it("finds Bremen nearby railway stations", async () => {
    const candidates = await discoverCandidateDepartures({ origin: bremen, radiusKm: 120, allowedModes: ["train"] }, dependencies);
    expect(candidates.map(({ location }) => location.stationCode)).toEqual(["DEBRE", "DEBRV", "DEHAM", "DEHAN"]);
  });

  it("filters by maximum ground travel duration", async () => {
    const candidates = await discoverCandidateDepartures({
      origin: bremen,
      radiusKm: 250,
      maximumGroundTravelDurationMinutes: 80,
      allowedModes: ["flight"],
    }, dependencies);
    expect(candidates.map(({ location }) => location.iataCode)).toEqual(["BRE", "HAM"]);
  });

  it("filters candidate location types by transport mode", async () => {
    const candidates = await discoverCandidateDepartures({ origin: bremen, radiusKm: 100, allowedModes: ["ferry"] }, dependencies);
    expect(candidates).toHaveLength(1);
    expect(candidates[0]).toMatchObject({ mode: "ferry", location: { type: "ferry-terminal", portCode: "DEBRV" } });
  });

  it("deduplicates locations by strong canonical code using source precedence", () => {
    const preferred = requiredLocation("loc:airport:de:ham");
    const duplicate = createCanonicalLocation({
      ...preferred,
      id: "loc:airport:de:hamburg-provider-copy",
      name: "Hamburg Fuhlsbüttel Airport",
      sources: [{ sourceId: "secondary-demo", sourceRecordId: "HAM-copy", sourceType: "demo", retrievedAt: "2026-07-21T00:00:00.000Z" }],
      lastUpdatedAt: "2026-07-21T00:00:00.000Z",
    });

    const merged = deduplicateCanonicalLocations([duplicate, preferred], { sourcePrecedence: [provider.id, "secondary-demo"] });
    expect(merged).toHaveLength(1);
    expect(merged[0]).toMatchObject({ id: "loc:airport:de:ham", name: "Hamburg Airport" });
    expect(merged[0].sources).toHaveLength(2);
    expect(merged[0].aliases).toContain("Hamburg Fuhlsbüttel Airport");
  });

  it("defensively applies radius filtering when a provider over-returns", async () => {
    const overReturningProvider: NearbyLocationSearchProvider = {
      id: "over-returning-demo",
      async searchNearby() { return demoGlobalLocations.filter(({ type }) => type === "airport"); },
    };
    const candidates = await discoverCandidateDepartures(
      { origin: bremen, radiusKm: 50, allowedModes: ["flight"] },
      { ...dependencies, nearbyProvider: overReturningProvider },
    );
    expect(candidates.map(({ location }) => location.iataCode)).toEqual(["BRE"]);
  });

  it("uses positioning cost as the deterministic distance tie-breaker", async () => {
    const first = createCanonicalLocation({
      ...requiredLocation("loc:airport:de:bre"),
      id: "loc:airport:de:tst1",
      iataCode: "TS1",
      name: "Test Airport One",
    });
    const second = createCanonicalLocation({ ...first, id: "loc:airport:de:tst2", iataCode: "TS2", name: "Test Airport Two" });
    const nearbyProvider: NearbyLocationSearchProvider = {
      id: "cost-ranking-demo",
      async searchNearby() { return [first, second]; },
    };
    const costEstimator: GroundPositioningEstimator = {
      async estimate(_origin, destination) {
        return { durationMinutes: 20, cost: destination.iataCode === "TS1" ? 20 : 5, currency: "EUR" };
      },
    };

    const candidates = await discoverCandidateDepartures(
      { origin: bremen, radiusKm: 50, allowedModes: ["flight"] },
      { nearbyProvider, positioningEstimator: costEstimator, sourcePrecedence: [nearbyProvider.id] },
    );
    expect(candidates.map(({ location }) => location.iataCode)).toEqual(["TS2", "TS1"]);
  });
});

describe("canonical location model", () => {
  it("rejects invalid coordinates", () => {
    const airport = requiredLocation("loc:airport:de:bre");
    expect(() => createCanonicalLocation({ ...airport, latitude: 91 })).toThrow("Invalid latitude");
    expect(() => createCanonicalLocation({ ...airport, longitude: Number.NaN })).toThrow("Invalid longitude");
  });

  it("generates stable provider-independent canonical IDs", () => {
    const input = { type: "airport" as const, countryCode: "DE", primaryCodeOrSlug: "HAM" };
    expect(buildCanonicalLocationId(input)).toBe("loc:airport:de:ham");
    expect(buildCanonicalLocationId(input)).toBe(buildCanonicalLocationId(input));
  });

  it("retains source freshness metadata", () => {
    const location = requiredLocation("loc:airport:de:ham");
    expect(location.lastUpdatedAt).toBe("2026-07-22T00:00:00.000Z");
    expect(location.sources).toEqual([
      expect.objectContaining({ sourceId: "demo-global-locations", sourceType: "demo", retrievedAt: "2026-07-22T00:00:00.000Z" }),
    ]);
  });
});

function requiredLocation(id: string): CanonicalLocation {
  const location = demoGlobalLocations.find((candidate) => candidate.id === id);
  if (!location) throw new Error(`Missing demo global location ${id}`);
  return location;
}
