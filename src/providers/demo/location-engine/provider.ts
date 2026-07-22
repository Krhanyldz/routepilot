import type { CanonicalLocation, DepartureLocationType } from "@/domain/location";
import type {
  AirportSearchProvider,
  FerryTerminalSearchProvider,
  GeocodingProvider,
  LocationTextSearchQuery,
  NearbyLocationQuery,
  NearbyLocationSearchProvider,
  RailwayStationSearchProvider,
} from "@/providers/location-interfaces";
import { haversineDistanceKm } from "@/routing/geography";
import { demoGlobalLocations } from "./locations";

export class DemoGlobalLocationProvider implements
  GeocodingProvider,
  NearbyLocationSearchProvider,
  AirportSearchProvider,
  RailwayStationSearchProvider,
  FerryTerminalSearchProvider {
  readonly id = "demo-global-locations";

  async geocode(query: LocationTextSearchQuery): Promise<readonly CanonicalLocation[]> {
    return searchCatalog(query);
  }

  async searchNearby(query: NearbyLocationQuery): Promise<readonly CanonicalLocation[]> {
    const allowedTypes = query.types ? new Set<DepartureLocationType>(query.types) : null;
    return demoGlobalLocations.filter((location) =>
      location.type !== "city" &&
      (!allowedTypes || allowedTypes.has(location.type)) &&
      (query.radiusKm === undefined || haversineDistanceKm(query, location) <= query.radiusKm),
    );
  }

  async searchAirports(query: LocationTextSearchQuery): Promise<readonly CanonicalLocation[]> {
    return searchCatalog(query, "airport");
  }

  async searchRailwayStations(query: LocationTextSearchQuery): Promise<readonly CanonicalLocation[]> {
    return searchCatalog(query, "railway-station");
  }

  async searchFerryTerminals(query: LocationTextSearchQuery): Promise<readonly CanonicalLocation[]> {
    return searchCatalog(query, "ferry-terminal");
  }
}

function searchCatalog(query: LocationTextSearchQuery, type?: CanonicalLocation["type"]): readonly CanonicalLocation[] {
  const normalizedQuery = query.query.trim().toLocaleLowerCase();
  const countryCodes = query.countryCodes ? new Set(query.countryCodes.map((code) => code.toUpperCase())) : null;
  return demoGlobalLocations
    .filter((location) =>
      (!type || location.type === type) &&
      (!countryCodes || countryCodes.has(location.countryCode)) &&
      [location.name, location.city, location.iataCode, location.stationCode, location.portCode, ...location.aliases]
        .some((value) => value?.toLocaleLowerCase().includes(normalizedQuery)),
    )
    .slice(0, query.limit ?? 20);
}
