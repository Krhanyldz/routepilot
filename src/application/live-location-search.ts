import type { CanonicalLocation } from "@/domain/location";
import type { AirportSearchProvider, GeocodingProvider, LocationTextSearchQuery } from "@/providers/location-interfaces";
import { LocationSearchProviderError } from "@/providers/location-interfaces";

export type LiveLocationSearchKind = "airport" | "city-and-airport";

export interface LiveLocationSearchRequest extends LocationTextSearchQuery {
  kind: LiveLocationSearchKind;
}

export type LiveLocationSearchOutcome =
  | { status: "success"; locations: readonly CanonicalLocation[] }
  | { status: "unavailable"; reason: "live-mode-disabled" | "provider-misconfigured" }
  | { status: "failure"; reason: "rate-limit" | "timeout" | "upstream" | "invalid-response" };

export interface LiveLocationSearchDependencies {
  provider: (AirportSearchProvider & GeocodingProvider) | null;
  configured: boolean;
}

export async function executeLiveLocationSearch(
  request: LiveLocationSearchRequest,
  dependencies: LiveLocationSearchDependencies,
): Promise<LiveLocationSearchOutcome> {
  if (!dependencies.configured) return { status: "unavailable", reason: "live-mode-disabled" };
  if (!dependencies.provider) return { status: "unavailable", reason: "provider-misconfigured" };
  try {
    const locations = request.kind === "airport"
      ? await dependencies.provider.searchAirports(request)
      : await dependencies.provider.geocode(request);
    return { status: "success", locations };
  } catch (error) {
    if (!(error instanceof LocationSearchProviderError)) return { status: "failure", reason: "upstream" };
    if (error.code === "invalid-request") throw error;
    if (error.code === "authentication") return { status: "unavailable", reason: "provider-misconfigured" };
    return { status: "failure", reason: error.code };
  }
}

export function parseLiveLocationSearchRequest(searchParams: URLSearchParams): LiveLocationSearchRequest {
  const allowed = new Set(["query", "kind", "countryCodes", "limit"]);
  if ([...searchParams.keys()].some((key) => !allowed.has(key))) throw invalid("Unsupported search parameter");
  const query = searchParams.get("query") ?? "";
  const kind = searchParams.get("kind") ?? "city-and-airport";
  if (kind !== "airport" && kind !== "city-and-airport") throw invalid("Invalid location kind");
  const limitValue = searchParams.get("limit");
  const limit = limitValue === null ? 10 : Number(limitValue);
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 20) throw invalid("Location limit must be from 1 to 20");
  const countryValue = searchParams.get("countryCodes");
  const countryCodes = countryValue ? countryValue.split(",").filter(Boolean) : undefined;
  if (query.trim().length < 2 || query.trim().length > 80) throw invalid("Location query must contain 2 to 80 characters");
  if (countryCodes && (countryCodes.length > 5 || countryCodes.some((code) => !/^[A-Z]{2}$/.test(code)))) {
    throw invalid("Invalid country codes");
  }
  return { query: query.trim(), kind, limit, ...(countryCodes ? { countryCodes } : {}) };
}

function invalid(message: string): LocationSearchProviderError {
  return new LocationSearchProviderError("invalid-request", message, false);
}
