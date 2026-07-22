import { LOCATION_TYPE_TRANSPORT_MODE, type CanonicalLocation, type DepartureLocationType } from "@/domain/location";
import type { TransportMode } from "@/domain/models";
import type { NearbyLocationSearchProvider } from "@/providers/location-interfaces";
import { haversineDistanceKm } from "./geography";
import { deduplicateCanonicalLocations } from "./location-deduplication";

export interface GroundPositioningEstimate {
  durationMinutes: number;
  cost: number;
  currency: string;
}

export interface GroundPositioningEstimator {
  estimate(origin: CanonicalLocation, destination: CanonicalLocation): Promise<GroundPositioningEstimate | null>;
}

export interface CandidateDepartureSearch {
  origin: CanonicalLocation;
  radiusKm?: number;
  maximumGroundTravelDurationMinutes?: number;
  allowedModes: readonly TransportMode[];
}

export interface CandidateDeparture {
  location: CanonicalLocation;
  mode: TransportMode;
  distanceKm: number;
  positioning: GroundPositioningEstimate | null;
}

export interface CandidateDepartureDependencies {
  nearbyProvider: NearbyLocationSearchProvider;
  positioningEstimator: GroundPositioningEstimator;
  sourcePrecedence: readonly string[];
}

export async function discoverCandidateDepartures(
  search: CandidateDepartureSearch,
  dependencies: CandidateDepartureDependencies,
): Promise<CandidateDeparture[]> {
  if (search.radiusKm !== undefined && (!Number.isFinite(search.radiusKm) || search.radiusKm < 0)) {
    throw new Error("Search radius must be nonnegative");
  }
  if (search.maximumGroundTravelDurationMinutes !== undefined &&
    (!Number.isSafeInteger(search.maximumGroundTravelDurationMinutes) || search.maximumGroundTravelDurationMinutes < 0)) {
    throw new Error("Maximum ground travel duration must be a nonnegative whole number");
  }

  const locationTypes = modesToLocationTypes(search.allowedModes);
  const providerResults = await dependencies.nearbyProvider.searchNearby({
    latitude: search.origin.latitude,
    longitude: search.origin.longitude,
    radiusKm: search.radiusKm,
    types: locationTypes,
  });
  const locations = deduplicateCanonicalLocations(providerResults, { sourcePrecedence: dependencies.sourcePrecedence });
  const candidates = await Promise.all(locations.map(async (location): Promise<CandidateDeparture | null> => {
    const mode = location.type === "city" ? null : LOCATION_TYPE_TRANSPORT_MODE[location.type];
    if (!mode || !search.allowedModes.includes(mode)) return null;
    const distanceKm = haversineDistanceKm(search.origin, location);
    if (search.radiusKm !== undefined && distanceKm > search.radiusKm) return null;
    const positioning = await dependencies.positioningEstimator.estimate(search.origin, location);
    if (search.maximumGroundTravelDurationMinutes !== undefined &&
      (!positioning || positioning.durationMinutes > search.maximumGroundTravelDurationMinutes)) return null;
    return { location, mode, distanceKm, positioning };
  }));

  return candidates
    .filter((candidate): candidate is CandidateDeparture => candidate !== null)
    .sort((a, b) => a.distanceKm - b.distanceKm || positioningCost(a) - positioningCost(b) || a.location.id.localeCompare(b.location.id));
}

function modesToLocationTypes(modes: readonly TransportMode[]): DepartureLocationType[] {
  const modeSet = new Set(modes);
  return (Object.entries(LOCATION_TYPE_TRANSPORT_MODE) as Array<[DepartureLocationType, TransportMode]>)
    .filter(([, mode]) => modeSet.has(mode))
    .map(([type]) => type);
}

function positioningCost(candidate: CandidateDeparture): number {
  return candidate.positioning?.cost ?? Number.POSITIVE_INFINITY;
}
