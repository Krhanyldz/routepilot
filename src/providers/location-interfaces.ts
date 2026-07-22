import type { CanonicalLocation, DepartureLocationType } from "@/domain/location";

export interface LocationTextSearchQuery {
  query: string;
  countryCodes?: readonly string[];
  limit?: number;
}

export interface NearbyLocationQuery {
  latitude: number;
  longitude: number;
  radiusKm?: number;
  types?: readonly DepartureLocationType[];
}

export interface GeocodingProvider {
  readonly id: string;
  geocode(query: LocationTextSearchQuery): Promise<readonly CanonicalLocation[]>;
}

export interface NearbyLocationSearchProvider {
  readonly id: string;
  searchNearby(query: NearbyLocationQuery): Promise<readonly CanonicalLocation[]>;
}

export interface AirportSearchProvider {
  readonly id: string;
  searchAirports(query: LocationTextSearchQuery): Promise<readonly CanonicalLocation[]>;
}

export interface RailwayStationSearchProvider {
  readonly id: string;
  searchRailwayStations(query: LocationTextSearchQuery): Promise<readonly CanonicalLocation[]>;
}

export interface FerryTerminalSearchProvider {
  readonly id: string;
  searchFerryTerminals(query: LocationTextSearchQuery): Promise<readonly CanonicalLocation[]>;
}
