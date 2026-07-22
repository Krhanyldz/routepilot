import { describe, expect, it } from "vitest";
import { DemoLocationProvider } from "@/providers/demo";
import { discoverNearbyDeparturePoints, haversineDistanceKm } from "./geography";

const locations = new DemoLocationProvider();
const bremen = locations.getById("city-bremen");

if (!bremen) throw new Error("Demo Bremen location is missing");

describe("geographical departure discovery", () => {
  it("calculates Haversine distance", () => {
    const hamburg = locations.getById("airport-hamburg");
    if (!hamburg) throw new Error("Demo Hamburg location is missing");
    expect(haversineDistanceKm(bremen, hamburg)).toBeCloseTo(99.78, 1);
  });

  it.each([
    [50, ["city-bremen", "airport-bremen"]],
    [100, ["city-bremen", "airport-bremen", "airport-hannover", "airport-hamburg"]],
    [150, ["city-bremen", "airport-bremen", "airport-hannover", "airport-hamburg", "airport-fmo"]],
    [250, ["city-bremen", "airport-bremen", "airport-hannover", "airport-hamburg", "airport-fmo", "airport-dortmund"]],
  ])("returns only departure points within %i km", (radius, expectedIds) => {
    const result = discoverNearbyDeparturePoints(bremen, radius, locations);
    expect(result.map(({ location }) => location.id).sort()).toEqual(expectedIds.sort());
    expect(result.every(({ distanceKm }) => distanceKm <= radius)).toBe(true);
  });

  it("keeps Amsterdam discoverable but excludes it beyond the selected radius", () => {
    expect(locations.listDeparturePoints().some(({ code }) => code === "AMS")).toBe(true);
    expect(discoverNearbyDeparturePoints(bremen, 250, locations).some(({ location }) => location.code === "AMS")).toBe(false);
  });
});
