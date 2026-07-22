import type { LiveFlightOffer, LiveFlightSearchResult, LiveFlightSegment } from "@/providers/live-flight";

export interface LocationOption {
  id: string;
  name: string;
  city: string;
  countryCode: string;
  iataCode: string;
  type: "airport" | "city";
}

export class LiveSearchClientError extends Error {
  constructor(readonly reason: string, readonly status: number) {
    super(reason);
    this.name = "LiveSearchClientError";
  }
}

export async function searchLiveLocations(
  query: string,
  signal?: AbortSignal,
  fetchImpl: typeof fetch = fetch,
): Promise<readonly LocationOption[]> {
  const params = new URLSearchParams({ query, kind: "city-and-airport", limit: "8" });
  const response = await fetchImpl(`/api/locations/search?${params}`, { signal, headers: { Accept: "application/json" } });
  const payload = await responseJson(response);
  if (!response.ok) throw apiError(payload, response.status);
  if (!isRecord(payload) || payload.status !== "success" || !Array.isArray(payload.locations)) throw invalidResponse();
  return payload.locations.map(normalizeLocationOption);
}

export async function searchLiveFlights(
  input: {
    originIataCode: string;
    destinationIataCode: string;
    departureDate: string;
    returnDate?: string;
    adults: number;
  },
  fetchImpl: typeof fetch = fetch,
): Promise<LiveFlightSearchResult> {
  const response = await fetchImpl("/api/flights/search", {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({ ...input, currencyCode: "EUR", maxResults: 20 }),
  });
  const payload = await responseJson(response);
  if (!response.ok) throw apiError(payload, response.status);
  if (!isRecord(payload) || payload.status !== "success" || !isRecord(payload.result)) throw invalidResponse();
  return normalizeFlightResult(payload.result);
}

function normalizeLocationOption(value: unknown): LocationOption {
  if (!isRecord(value)) throw invalidResponse();
  const type = requiredString(value.type);
  if (type !== "airport" && type !== "city") throw invalidResponse();
  const iataCode = requiredString(value.iataCode);
  if (!/^[A-Z]{3}$/.test(iataCode)) throw invalidResponse();
  return {
    id: requiredString(value.id),
    name: requiredString(value.name),
    city: requiredString(value.city),
    countryCode: requiredString(value.countryCode),
    iataCode,
    type,
  };
}

function normalizeFlightResult(value: Record<string, unknown>): LiveFlightSearchResult {
  if (!Array.isArray(value.offers) || !Array.isArray(value.warnings) || !value.warnings.every((item) => typeof item === "string")) {
    throw invalidResponse();
  }
  const coverage = requiredString(value.coverage);
  if (coverage !== "complete" && coverage !== "provider-limited") throw invalidResponse();
  return {
    providerId: requiredString(value.providerId),
    fetchedAt: requiredString(value.fetchedAt),
    offers: value.offers.map(normalizeFlightOffer),
    warnings: value.warnings,
    coverage,
  };
}

function normalizeFlightOffer(value: unknown): LiveFlightOffer {
  if (!isRecord(value) || !Array.isArray(value.segments) || !Array.isArray(value.validatingAirlineCodes)) throw invalidResponse();
  return {
    id: requiredString(value.id),
    providerId: requiredString(value.providerId),
    dataSource: value.dataSource === "live" ? "live" : invalidResponse(),
    sourceRecordId: requiredString(value.sourceRecordId),
    fetchedAt: requiredString(value.fetchedAt),
    currencyCode: requiredString(value.currencyCode),
    totalPrice: requiredString(value.totalPrice),
    totalDurationMinutes: requiredNumber(value.totalDurationMinutes),
    transfers: requiredNumber(value.transfers),
    validatingAirlineCodes: value.validatingAirlineCodes.map(requiredString),
    segments: value.segments.map(normalizeFlightSegment),
    ...(typeof value.basePrice === "string" ? { basePrice: value.basePrice } : {}),
    ...(typeof value.lastTicketingDate === "string" ? { lastTicketingDate: value.lastTicketingDate } : {}),
    ...(typeof value.bookableSeats === "number" ? { bookableSeats: value.bookableSeats } : {}),
  };
}

function normalizeFlightSegment(value: unknown): LiveFlightSegment {
  if (!isRecord(value)) throw invalidResponse();
  return {
    id: requiredString(value.id),
    departureIataCode: requiredString(value.departureIataCode),
    departureAt: requiredString(value.departureAt),
    arrivalIataCode: requiredString(value.arrivalIataCode),
    arrivalAt: requiredString(value.arrivalAt),
    marketingCarrierCode: requiredString(value.marketingCarrierCode),
    flightNumber: requiredString(value.flightNumber),
    durationMinutes: requiredNumber(value.durationMinutes),
    ...(typeof value.departureTerminal === "string" ? { departureTerminal: value.departureTerminal } : {}),
    ...(typeof value.arrivalTerminal === "string" ? { arrivalTerminal: value.arrivalTerminal } : {}),
  };
}

async function responseJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    throw invalidResponse();
  }
}

function apiError(payload: unknown, status: number): LiveSearchClientError {
  const reason = isRecord(payload) && typeof payload.reason === "string" ? payload.reason : "request-failed";
  return new LiveSearchClientError(reason, status);
}

function invalidResponse(): never {
  throw new LiveSearchClientError("invalid-response", 502);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requiredString(value: unknown): string {
  if (typeof value !== "string" || !value) throw invalidResponse();
  return value;
}

function requiredNumber(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) throw invalidResponse();
  return value;
}
