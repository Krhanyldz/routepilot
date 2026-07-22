import tzLookup from "tz-lookup";
import { buildCanonicalLocationId, createCanonicalLocation, type CanonicalLocation, type CanonicalLocationType } from "@/domain/location";
import type { AirportSearchProvider, GeocodingProvider, LocationTextSearchQuery } from "@/providers/location-interfaces";
import { AmadeusApiError, type AmadeusAuthorizedClient } from "./client";

export class AmadeusLocationProviderError extends Error {
  constructor(
    readonly code: "invalid-request" | "authentication" | "rate-limit" | "timeout" | "upstream" | "invalid-response",
    message: string,
    readonly retryable: boolean,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = "AmadeusLocationProviderError";
  }
}

export class AmadeusLocationProvider implements AirportSearchProvider, GeocodingProvider {
  readonly id = "amadeus-airport-city-search";

  constructor(
    private readonly client: AmadeusAuthorizedClient,
    private readonly now: () => number = Date.now,
  ) {}

  searchAirports(query: LocationTextSearchQuery): Promise<readonly CanonicalLocation[]> {
    return this.search(query, "AIRPORT");
  }

  geocode(query: LocationTextSearchQuery): Promise<readonly CanonicalLocation[]> {
    return this.search(query, "CITY,AIRPORT");
  }

  private async search(query: LocationTextSearchQuery, subType: "AIRPORT" | "CITY,AIRPORT"): Promise<readonly CanonicalLocation[]> {
    validateQuery(query);
    const countries = query.countryCodes?.length ? [...new Set(query.countryCodes)] : [undefined];
    try {
      const payloads = await Promise.all(countries.map((countryCode) => this.client.get(
        "/v1/reference-data/locations",
        searchParams(query, subType, countryCode),
      )));
      const retrievedAt = new Date(this.now()).toISOString();
      const locations = payloads.flatMap((payload) => normalizePayload(payload, this.id, retrievedAt));
      return [...new Map(locations.map((location) => [location.id, location])).values()].slice(0, query.limit ?? 10);
    } catch (error) {
      if (error instanceof AmadeusLocationProviderError) throw error;
      if (error instanceof AmadeusApiError) {
        throw new AmadeusLocationProviderError(error.code, error.message, error.retryable, { cause: error });
      }
      throw new AmadeusLocationProviderError("upstream", "Amadeus location search failed", true, { cause: error });
    }
  }
}

function validateQuery(query: LocationTextSearchQuery): void {
  const keyword = query.query.trim();
  if (keyword.length < 2 || keyword.length > 40 || !/^[A-Za-z0-9./:'()" -]+$/.test(keyword)) {
    throw new AmadeusLocationProviderError("invalid-request", "Location keyword must contain 2 to 40 supported characters", false);
  }
  if (query.limit !== undefined && (!Number.isSafeInteger(query.limit) || query.limit < 1 || query.limit > 20)) {
    throw new AmadeusLocationProviderError("invalid-request", "Location limit must be from 1 to 20", false);
  }
  if (query.countryCodes && (query.countryCodes.length > 5 || query.countryCodes.some((code) => !/^[A-Z]{2}$/.test(code)))) {
    throw new AmadeusLocationProviderError("invalid-request", "Country codes must be uppercase ISO alpha-2 values", false);
  }
}

function searchParams(
  query: LocationTextSearchQuery,
  subType: "AIRPORT" | "CITY,AIRPORT",
  countryCode: string | undefined,
): URLSearchParams {
  const params = new URLSearchParams({
    keyword: query.query.trim(),
    subType,
    view: "FULL",
    sort: "analytics.travelers.score",
    "page[limit]": String(query.limit ?? 10),
  });
  if (countryCode) params.set("countryCode", countryCode);
  return params;
}

function normalizePayload(payload: unknown, providerId: string, retrievedAt: string): CanonicalLocation[] {
  if (!isRecord(payload) || !Array.isArray(payload.data)) throw malformed("response data");
  return payload.data.map((record, index) => normalizeLocation(record, index, providerId, retrievedAt));
}

function normalizeLocation(value: unknown, index: number, providerId: string, retrievedAt: string): CanonicalLocation {
  if (!isRecord(value)) throw malformed(`location ${index}`);
  const sourceRecordId = requiredString(value.id, "location id");
  const subType = requiredString(value.subType, "location subtype");
  const type: CanonicalLocationType = subType === "AIRPORT" ? "airport" : subType === "CITY" ? "city" : invalidSubtype(subType);
  const iataCode = requiredString(value.iataCode, "IATA code");
  if (!/^[A-Z]{3}$/.test(iataCode)) throw malformed("IATA code");
  const address = requiredRecord(value.address, "location address");
  const geoCode = requiredRecord(value.geoCode, "location coordinates");
  const latitude = requiredCoordinate(geoCode.latitude, -90, 90, "latitude");
  const longitude = requiredCoordinate(geoCode.longitude, -180, 180, "longitude");
  const city = requiredString(address.cityName, "city name");
  const countryCode = requiredString(address.countryCode, "country code");
  const name = requiredString(value.name, "location name");
  const detailedName = typeof value.detailedName === "string" ? value.detailedName : undefined;

  return createCanonicalLocation({
    id: buildCanonicalLocationId({ type, countryCode, primaryCodeOrSlug: iataCode }),
    name,
    city,
    countryCode,
    latitude,
    longitude,
    timeZone: tzLookup(latitude, longitude),
    type,
    iataCode,
    aliases: detailedName && detailedName !== name ? [detailedName] : [],
    sources: [{ sourceId: providerId, sourceRecordId, sourceType: "aggregator", retrievedAt }],
    lastUpdatedAt: retrievedAt,
  });
}

function invalidSubtype(subType: string): never {
  throw malformed(`location subtype ${subType}`);
}

function malformed(field: string): AmadeusLocationProviderError {
  return new AmadeusLocationProviderError("invalid-response", `Malformed Amadeus ${field}`, false);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requiredRecord(value: unknown, field: string): Record<string, unknown> {
  if (!isRecord(value)) throw malformed(field);
  return value;
}

function requiredString(value: unknown, field: string): string {
  if (typeof value !== "string" || !value.trim()) throw malformed(field);
  return value;
}

function requiredCoordinate(value: unknown, minimum: number, maximum: number, field: string): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < minimum || value > maximum) throw malformed(field);
  return value;
}
