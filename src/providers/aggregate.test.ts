import { describe, expect, it } from "vitest";
import { DemoFerryProvider, DemoFlightProvider, DemoTrainProvider } from "./demo";
import { aggregateTransportOffers } from "./aggregate";

describe("provider aggregation", () => {
  const providers = [new DemoFlightProvider(), new DemoTrainProvider(), new DemoFerryProvider()];

  it("aggregates normalized offers only from allowed provider modes", () => {
    const offers = aggregateTransportOffers(providers, ["flight", "train"]);
    expect(offers).toHaveLength(7);
    expect(new Set(offers.map(({ providerId }) => providerId))).toEqual(new Set(["demo-flights", "demo-trains"]));
    expect(offers.every(({ dataSource }) => dataSource === "demo")).toBe(true);
  });

  it("passes provider-independent query filters through", () => {
    const offers = aggregateTransportOffers(providers, ["flight"], { originLocationIds: ["airport-hamburg"] });
    expect(offers.map(({ id }) => id).sort()).toEqual(["ham-ayt", "ham-ist"]);
  });
});
