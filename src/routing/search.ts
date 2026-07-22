import type { Route, SearchConstraints, TransportOffer } from "@/domain/models";
import { aggregateTransportOffers } from "@/providers/aggregate";
import type { LocationSearchProvider, TransportSearchProvider } from "@/providers/interfaces";
import { discoverNearbyDeparturePoints } from "./geography";
import { findCheapestRoute } from "./engine";

export interface RouteSearchRequest {
  originLocationId: string;
  destinationLocationId: string;
  constraints: SearchConstraints;
}

export interface RouteSearchDependencies {
  locationProvider: LocationSearchProvider;
  transportProviders: readonly TransportSearchProvider[];
}

export interface RouteSearchResult {
  route: Route | null;
  consideredDeparturePoints: readonly string[];
  offers: readonly TransportOffer[];
}

export function searchRoutes(request: RouteSearchRequest, dependencies: RouteSearchDependencies): RouteSearchResult {
  const origin = dependencies.locationProvider.getById(request.originLocationId);
  if (!origin) throw new Error(`Unknown origin location: ${request.originLocationId}`);

  const nearby = request.constraints.nearbyDeparturesEnabled
    ? discoverNearbyDeparturePoints(origin, request.constraints.radiusKm, dependencies.locationProvider)
    : [];
  const consideredDeparturePoints = request.constraints.nearbyDeparturesEnabled
    ? [...new Set([request.originLocationId, ...nearby.map(({ location }) => location.id)])]
    : [request.originLocationId];
  const allowedPositioningDestinations = new Set(consideredDeparturePoints);

  const offers = aggregateTransportOffers(dependencies.transportProviders, request.constraints.allowedModes)
    .filter((offer) => !offer.positioning || (
      request.constraints.nearbyDeparturesEnabled && allowedPositioningDestinations.has(offer.toLocationId)
    ));

  return {
    route: findCheapestRoute(
      offers,
      request.originLocationId,
      request.destinationLocationId,
      request.constraints,
      request.constraints,
    ),
    consideredDeparturePoints,
    offers,
  };
}
