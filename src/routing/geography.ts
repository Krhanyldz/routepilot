import type { Location } from "@/domain/models";
import type { LocationSearchProvider } from "@/providers/interfaces";

const EARTH_RADIUS_KM = 6_371;

const toRadians = (degrees: number): number => degrees * (Math.PI / 180);

export function haversineDistanceKm(a: Location, b: Location): number {
  const latitudeDelta = toRadians(b.latitude - a.latitude);
  const longitudeDelta = toRadians(b.longitude - a.longitude);
  const aLatitude = toRadians(a.latitude);
  const bLatitude = toRadians(b.latitude);
  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(aLatitude) * Math.cos(bLatitude) * Math.sin(longitudeDelta / 2) ** 2;

  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(haversine));
}

export interface NearbyLocation {
  location: Location;
  distanceKm: number;
}

export function discoverNearbyDeparturePoints(
  origin: Location,
  radiusKm: number,
  provider: LocationSearchProvider,
): NearbyLocation[] {
  return provider
    .listDeparturePoints()
    .map((location) => ({ location, distanceKm: haversineDistanceKm(origin, location) }))
    .filter(({ distanceKm }) => distanceKm <= radiusKm)
    .sort((a, b) => a.distanceKm - b.distanceKm);
}
