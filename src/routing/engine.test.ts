import { describe, expect, it } from "vitest";
import type { SearchConstraints, TransportOffer } from "@/domain/models";
import { findCheapestRoute } from "./engine";

const constraints: SearchConstraints = {
  hasDeutschlandticket: true,
  nearbyDeparturesEnabled: true,
  radiusKm: 150,
  allowedModes: ["flight", "train", "ferry"],
  maxDurationMinutes: 1_000,
  maxTransfers: 4,
};

const offers: TransportOffer[] = [
  { id: "direct", providerId: "fixture", dataSource: "live", fromLocationId: "origin", toLocationId: "destination", mode: "flight", price: 300, durationMinutes: 180, transfers: 0 },
  { id: "position", providerId: "fixture", dataSource: "live", fromLocationId: "origin", toLocationId: "alternate", mode: "train", price: 20, durationMinutes: 60, transfers: 0, positioning: true, deutschlandticketEligible: true },
  { id: "alternate", providerId: "fixture", dataSource: "live", fromLocationId: "alternate", toLocationId: "destination", mode: "flight", price: 60, durationMinutes: 180, transfers: 0 },
];

describe("route engine", () => {
  it("selects the cheapest complete route and applies traveler entitlements", () => {
    const route = findCheapestRoute(offers, "origin", "destination", constraints, constraints);
    expect(route?.legs.map(({ id }) => id)).toEqual(["position", "alternate"]);
    expect(route?.totalCost).toBe(60);
  });

  it("charges positioning when the entitlement is absent", () => {
    const route = findCheapestRoute(offers, "origin", "destination", { hasDeutschlandticket: false });
    expect(route?.totalCost).toBe(80);
  });

  it("returns null when a destination cannot be reached", () => {
    expect(findCheapestRoute([], "origin", "missing", constraints)).toBeNull();
  });
});
