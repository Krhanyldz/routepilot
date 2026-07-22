import type { PricedLeg, Route, SearchConstraints, TravelerOptions } from "@/domain/models";
import { generateRouteExplanations } from "@/explanations/generate-route-explanation";
import { DemoFerryProvider, DemoFlightProvider, DemoLocationProvider, DemoTrainProvider } from "@/providers/demo";
import { findCheapestRoute } from "@/routing/engine";
import { searchRoutes } from "@/routing/search";

export const demoQueries = {
  Antalya: { origin: "Bremen", destination: "Antalya", originLocationId: "city-bremen", destinationLocationId: "airport-antalya" },
  Baotou: { origin: "Bremen", destination: "Baotou", originLocationId: "city-bremen", destinationLocationId: "station-baotou" },
} as const;

export type DemoDestination = keyof typeof demoQueries;

export const demoProviders = {
  locationProvider: new DemoLocationProvider(),
  transportProviders: [new DemoFlightProvider(), new DemoTrainProvider(), new DemoFerryProvider()],
} as const;

export const defaultSearchConstraints: SearchConstraints = {
  hasDeutschlandticket: true,
  nearbyDeparturesEnabled: true,
  radiusKm: 150,
  allowedModes: ["flight", "train", "ferry"],
  maxDurationMinutes: 48 * 60,
  maxTransfers: 4,
};

type DisplayLeg = PricedLeg & { from: string; to: string };
type DisplayRoute = Omit<Route, "legs"> & { legs: DisplayLeg[] };

export interface DemoComparison {
  recommended: DisplayRoute | null;
  alternatives: Array<{ label: string; totalCost: number }>;
  explanations: string[];
  explanation: string;
  consideredDeparturePoints: readonly string[];
}

function withLocationNames(route: Route | null): DisplayRoute | null {
  if (!route) return null;
  return {
    ...route,
    legs: route.legs.map((leg) => ({
      ...leg,
      from: demoProviders.locationProvider.getById(leg.fromLocationId)?.city ?? leg.fromLocationId,
      to: demoProviders.locationProvider.getById(leg.toLocationId)?.city ?? leg.toLocationId,
    })),
  };
}

export function getDemoComparison(
  destination: DemoDestination,
  options: TravelerOptions & Partial<Omit<SearchConstraints, keyof TravelerOptions>>,
): DemoComparison {
  const query = demoQueries[destination];
  const constraints: SearchConstraints = { ...defaultSearchConstraints, ...options };
  const result = searchRoutes({
    originLocationId: query.originLocationId,
    destinationLocationId: query.destinationLocationId,
    constraints,
  }, demoProviders);

  const directOffers = result.offers.filter((offer) => !offer.positioning);
  const direct = findCheapestRoute(directOffers, query.originLocationId, query.destinationLocationId, constraints, constraints);
  const explanations = result.route ? generateRouteExplanations({ recommended: result.route, direct, hasDeutschlandticket: constraints.hasDeutschlandticket }) : [];

  if (destination === "Antalya") {
    return {
      recommended: withLocationNames(result.route),
      alternatives: direct ? [{ label: "Direct from Bremen", totalCost: direct.totalCost }] : [],
      explanations,
      explanation: explanations.join(" "),
      consideredDeparturePoints: result.consideredDeparturePoints,
    };
  }

  const withoutFinalTrain = result.offers.filter((offer) => offer.id !== "urc-btc-train");
  const flightAlternative = findCheapestRoute(withoutFinalTrain, query.originLocationId, query.destinationLocationId, constraints, constraints);
  return {
    recommended: withLocationNames(result.route),
    alternatives: flightAlternative ? [{ label: "Fly Ürümqi → Baotou", totalCost: flightAlternative.totalCost }] : [],
    explanations,
    explanation: explanations.join(" "),
    consideredDeparturePoints: result.consideredDeparturePoints,
  };
}
