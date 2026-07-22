import { describe, expect, it } from "vitest";
import type { Location } from "@/domain/models";
import type { LocationSearchProvider } from "@/providers/interfaces";
import { discoverNearbyDeparturePoints, haversineDistanceKm } from "./geography";

const origin: Location = { id: "origin", name: "Origin", city: "Origin", countryCode: "ZZ", type: "city", latitude: 0, longitude: 0 };
const near: Location = { id: "near", name: "Near", city: "Near", countryCode: "ZZ", type: "airport", latitude: 0, longitude: 0.5, code: "NAA" };
const far: Location = { id: "far", name: "Far", city: "Far", countryCode: "ZZ", type: "airport", latitude: 0, longitude: 3, code: "FAA" };
const catalog = [origin, near, far];
const provider: LocationSearchProvider = {
  id: "test-locations",
  getById: (id) => catalog.find((location) => location.id === id),
  searchByCity: (city) => catalog.filter((location) => location.city === city),
  listDeparturePoints: () => catalog,
};

describe("geographical departure discovery", () => {
  it("calculates Haversine distance", () => {
    expect(haversineDistanceKm(origin, near)).toBeCloseTo(55.6, 1);
  });

  it("returns only locations inside the selected radius", () => {
    expect(discoverNearbyDeparturePoints(origin, 100, provider).map(({ location }) => location.id).sort())
      .toEqual(["near", "origin"]);
    expect(discoverNearbyDeparturePoints(origin, 250, provider).some(({ location }) => location.id === "far")).toBe(false);
  });
});
