import type { Route, SearchConstraints, TransportOffer, TravelerOptions } from "@/domain/models";
import { priceOffer } from "@/pricing/price-offer";

interface PartialRoute extends Route {
  currentLocationId: string;
  visitedLocationIds: ReadonlySet<string>;
}

const unconstrained: Pick<SearchConstraints, "maxDurationMinutes" | "maxTransfers"> = {
  maxDurationMinutes: Number.POSITIVE_INFINITY,
  maxTransfers: Number.POSITIVE_INFINITY,
};

/** Finds the cheapest simple path in a directed graph of normalized offers. */
export function findCheapestRoute(
  offers: readonly TransportOffer[],
  originLocationId: string,
  destinationLocationId: string,
  options: TravelerOptions,
  limits: Pick<SearchConstraints, "maxDurationMinutes" | "maxTransfers"> = unconstrained,
): Route | null {
  const queue: PartialRoute[] = [{
    currentLocationId: originLocationId,
    legs: [],
    totalCost: 0,
    totalDurationMinutes: 0,
    totalTransfers: 0,
    visitedLocationIds: new Set([originLocationId]),
  }];

  while (queue.length > 0) {
    queue.sort((a, b) => a.totalCost - b.totalCost);
    const current = queue.shift();
    if (!current) break;

    if (current.currentLocationId === destinationLocationId) {
      return {
        legs: current.legs,
        totalCost: current.totalCost,
        totalDurationMinutes: current.totalDurationMinutes,
        totalTransfers: current.totalTransfers,
      };
    }

    for (const offer of offers.filter((candidate) => candidate.fromLocationId === current.currentLocationId)) {
      if (current.visitedLocationIds.has(offer.toLocationId)) continue;
      const leg = priceOffer(offer, options);
      const nextDuration = current.totalDurationMinutes + leg.durationMinutes;
      const connectionTransfer = current.legs.length > 0 ? 1 : 0;
      const nextTransfers = current.totalTransfers + leg.transfers + connectionTransfer;
      if (nextDuration > limits.maxDurationMinutes || nextTransfers > limits.maxTransfers) continue;

      queue.push({
        currentLocationId: offer.toLocationId,
        legs: [...current.legs, leg],
        totalCost: current.totalCost + leg.price,
        totalDurationMinutes: nextDuration,
        totalTransfers: nextTransfers,
        visitedLocationIds: new Set([...current.visitedLocationIds, offer.toLocationId]),
      });
    }
  }

  return null;
}
