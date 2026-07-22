import { describe, expect, it } from "vitest";
import { TRANSPORT_MODES, type Location, type SearchConstraints, type TransportOffer } from "@/domain/models";
import type { LocationSearchProvider, TransportSearchProvider } from "@/providers/interfaces";
import { searchRoutes } from "./search";

const locations: Location[] = [
  { id: "origin", name: "Origin", city: "Origin", countryCode: "ZZ", type: "city", latitude: 0, longitude: 0 },
  { id: "alternate", name: "Alternate", city: "Alternate", countryCode: "ZZ", type: "airport", latitude: 0, longitude: 0.5, code: "ALT" },
  { id: "destination", name: "Destination", city: "Destination", countryCode: "ZZ", type: "airport", latitude: 10, longitude: 10, code: "DST" },
];
const offers: TransportOffer[] = [
  { id: "direct", providerId: "fixture", dataSource: "live", fromLocationId: "origin", toLocationId: "destination", mode: "flight", price: 300, durationMinutes: 180, transfers: 0 },
  { id: "position", providerId: "fixture", dataSource: "live", fromLocationId: "origin", toLocationId: "alternate", mode: "train", price: 20, durationMinutes: 60, transfers: 0, positioning: true, deutschlandticketEligible: true },
  { id: "alternate-flight", providerId: "fixture", dataSource: "live", fromLocationId: "alternate", toLocationId: "destination", mode: "flight", price: 60, durationMinutes: 180, transfers: 0 },
];
const locationProvider: LocationSearchProvider = {
  id: "fixture-locations",
  getById: (id) => locations.find((location) => location.id === id),
  searchByCity: (city) => locations.filter((location) => location.city === city),
  listDeparturePoints: () => locations,
};
const transportProviders: TransportSearchProvider[] = TRANSPORT_MODES.map((mode) => ({
  id: `fixture-${mode}`,
  mode,
  search: () => offers.filter((offer) => offer.mode === mode),
}));
const constraints: SearchConstraints = {
  hasDeutschlandticket: true,
  nearbyDeparturesEnabled: true,
  radiusKm: 100,
  allowedModes: TRANSPORT_MODES,
  maxDurationMinutes: 1_000,
  maxTransfers: 4,
};

const search = (changes: Partial<SearchConstraints> = {}) => searchRoutes({
  originLocationId: "origin",
  destinationLocationId: "destination",
  constraints: { ...constraints, ...changes },
}, { locationProvider, transportProviders });

describe("provider-backed route search", () => {
  it("includes a nearby positioning connection and entitlement price", () => {
    expect(search().route).toMatchObject({ totalCost: 60, legs: [{ id: "position", price: 0 }, { id: "alternate-flight" }] });
  });

  it("charges positioning without the entitlement", () => {
    expect(search({ hasDeutschlandticket: false }).route?.totalCost).toBe(80);
  });

  it("uses only the origin when nearby search is disabled", () => {
    expect(search({ nearbyDeparturesEnabled: false })).toMatchObject({
      consideredDeparturePoints: ["origin"],
      route: { totalCost: 300, legs: [{ id: "direct" }] },
    });
  });

  it("applies duration and transfer constraints", () => {
    expect(search({ maxDurationMinutes: 170 }).route).toBeNull();
    expect(search({ maxTransfers: 0 }).route?.legs.map(({ id }) => id)).toEqual(["direct"]);
  });

  it("contains no unsupported transport mode", () => {
    expect(TRANSPORT_MODES).toEqual(["flight", "train", "ferry"]);
  });
});
