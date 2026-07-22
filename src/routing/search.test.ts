import { describe, expect, it } from "vitest";
import { defaultSearchConstraints, demoProviders, getDemoComparison } from "@/application/demo-search";
import { TRANSPORT_MODES } from "@/domain/models";
import type { SearchConstraints } from "@/domain/models";
import { searchRoutes } from "./search";

const searchAntalya = (changes: Partial<SearchConstraints> = {}) => searchRoutes({
  originLocationId: "city-bremen",
  destinationLocationId: "airport-antalya",
  constraints: { ...defaultSearchConstraints, ...changes },
}, demoProviders);

describe("provider-backed route search", () => {
  it("uses provider interfaces to include the Bremen to Hamburg positioning leg", () => {
    const result = searchAntalya();
    expect(result.route?.legs[0].id).toBe("bre-ham");
    expect(result.route?.legs[0].basePrice).toBe(20);
    expect(result.route?.legs[0].price).toBe(0);
  });

  it("charges €20 for positioning without a Deutschlandticket", () => {
    const result = searchAntalya({ hasDeutschlandticket: false });
    expect(result.route?.legs[0].price).toBe(20);
    expect(result.route?.totalCost).toBe(79);
  });

  it("states the complete Hamburg departure saving", () => {
    expect(getDemoComparison("Antalya", defaultSearchConstraints).explanations).toContain(
      "Hamburg’dan çıkmak toplam €241 tasarruf sağlıyor.",
    );
  });

  it("uses only Bremen and returns the direct route when nearby search is disabled", () => {
    const result = searchAntalya({ nearbyDeparturesEnabled: false });
    expect(result.consideredDeparturePoints).toEqual(["city-bremen"]);
    expect(result.route?.legs.map(({ id }) => id)).toEqual(["bre-ayt"]);
    expect(result.route?.totalCost).toBe(300);
  });

  it("filters routes exceeding maximum duration", () => {
    expect(searchAntalya({ maxDurationMinutes: 200 }).route).toBeNull();
    expect(searchAntalya({ maxDurationMinutes: 250 }).route?.legs.map(({ id }) => id)).toEqual(["bre-ayt"]);
  });

  it("filters routes exceeding maximum transfers", () => {
    expect(searchAntalya({ maxTransfers: 0 }).route?.legs.map(({ id }) => id)).toEqual(["bre-ayt"]);
    expect(getDemoComparison("Baotou", { ...defaultSearchConstraints, maxTransfers: 2 }).recommended).toBeNull();
  });

  it("contains no unsupported transport mode", () => {
    expect(TRANSPORT_MODES).toEqual(["flight", "train", "ferry"]);
    expect(documentModes()).toEqual(["flight", "train", "ferry"]);
  });
});

function documentModes(): readonly string[] {
  return defaultSearchConstraints.allowedModes;
}
