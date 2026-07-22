import { describe, expect, it } from "vitest";
import type { TransportMode, TransportOffer } from "@/domain/models";
import type { TransportSearchProvider } from "./interfaces";
import { aggregateTransportOffers } from "./aggregate";

const offers: TransportOffer[] = [
  { id: "flight-one", providerId: "live-flight", dataSource: "live", fromLocationId: "origin", toLocationId: "destination", mode: "flight", price: 100, durationMinutes: 60, transfers: 0 },
  { id: "train-one", providerId: "live-train", dataSource: "live", fromLocationId: "origin", toLocationId: "alternate", mode: "train", price: 20, durationMinutes: 30, transfers: 0 },
];
const provider = (mode: TransportMode): TransportSearchProvider => ({
  id: `live-${mode}`,
  mode,
  search: (query) => offers.filter((offer) =>
    offer.mode === mode && (!query.originLocationIds || query.originLocationIds.includes(offer.fromLocationId)),
  ),
});
const providers = [provider("flight"), provider("train"), provider("ferry")];

describe("provider aggregation", () => {
  it("aggregates normalized offers only from allowed provider modes", () => {
    const result = aggregateTransportOffers(providers, ["flight"]);
    expect(result).toEqual([expect.objectContaining({ id: "flight-one", dataSource: "live" })]);
  });

  it("passes provider-independent query filters through", () => {
    expect(aggregateTransportOffers(providers, ["flight"], { originLocationIds: ["missing"] })).toEqual([]);
  });
});
