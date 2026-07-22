import {
  LiveFlightProviderError,
  type LiveFlightOffer,
  type LiveFlightSearchProvider,
  type LiveFlightSearchQuery,
  type LiveFlightSearchResult,
  type LiveFlightSegment,
} from "@/providers/live-flight";
import type { AmadeusConfig } from "./config";

type Fetch = typeof fetch;

interface CachedToken {
  value: string;
  expiresAtMs: number;
}

export const AMADEUS_COVERAGE_WARNING =
  "Amadeus Self-Service coverage excludes some airlines and low-cost carriers; results are cheapest only among returned offers.";

export class AmadeusFlightProvider implements LiveFlightSearchProvider {
  readonly id = "amadeus-self-service";
  private token: CachedToken | undefined;

  constructor(
    private readonly config: AmadeusConfig,
    private readonly fetchImpl: Fetch = fetch,
    private readonly now: () => number = Date.now,
  ) {}

  async searchFlights(query: LiveFlightSearchQuery): Promise<LiveFlightSearchResult> {
    validateQuery(query);
    const fetchedAt = new Date(this.now()).toISOString();
    const response = await this.requestWithRetry(() => this.authorizedGet("/v2/shopping/flight-offers", toSearchParams(query)));
    const payload = await readJson(response);
    if (!response.ok) throw responseError(response.status, payload);
    const records = getArray(payload, "data");
    return {
      providerId: this.id,
      fetchedAt,
      offers: records.map((record, index) => normalizeOffer(record, index, this.id, fetchedAt)),
      warnings: [AMADEUS_COVERAGE_WARNING],
      coverage: "provider-limited",
    };
  }

  private async authorizedGet(path: string, params: URLSearchParams): Promise<Response> {
    const token = await this.getAccessToken();
    return this.withTimeout(`${this.config.baseUrl}${path}?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  private async getAccessToken(): Promise<string> {
    if (this.token && this.token.expiresAtMs - 60_000 > this.now()) return this.token.value;
    const body = new URLSearchParams({
      grant_type: "client_credentials",
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
    });
    const response = await this.withTimeout(`${this.config.baseUrl}/v1/security/oauth2/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    const payload = await readJson(response);
    if (!response.ok) throw responseError(response.status, payload);
    if (!isRecord(payload) || typeof payload.access_token !== "string" || typeof payload.expires_in !== "number") {
      throw new LiveFlightProviderError("invalid-response", "Amadeus token response is malformed", false);
    }
    this.token = { value: payload.access_token, expiresAtMs: this.now() + payload.expires_in * 1_000 };
    return this.token.value;
  }

  private async requestWithRetry(request: () => Promise<Response>): Promise<Response> {
    let response = await request();
    for (let attempt = 0; attempt < this.config.maxRetries && isTransient(response.status); attempt += 1) {
      response = await request();
    }
    return response;
  }

  private async withTimeout(input: string, init: RequestInit): Promise<Response> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.timeoutMs);
    try {
      return await this.fetchImpl(input, { ...init, signal: controller.signal, cache: "no-store" });
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throw new LiveFlightProviderError("timeout", "Amadeus request timed out", true, { cause: error });
      }
      throw new LiveFlightProviderError("upstream", "Amadeus request failed", true, { cause: error });
    } finally {
      clearTimeout(timeout);
    }
  }
}

function validateQuery(query: LiveFlightSearchQuery): void {
  for (const [label, value] of [["origin", query.originIataCode], ["destination", query.destinationIataCode]] as const) {
    if (!/^[A-Z]{3}$/.test(value)) throw new LiveFlightProviderError("invalid-request", `${label} must be a three-letter IATA code`, false);
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(query.departureDate) || (query.returnDate && !/^\d{4}-\d{2}-\d{2}$/.test(query.returnDate))) {
    throw new LiveFlightProviderError("invalid-request", "Dates must use YYYY-MM-DD", false);
  }
  if (!isCalendarDate(query.departureDate) || (query.returnDate && !isCalendarDate(query.returnDate))) {
    throw new LiveFlightProviderError("invalid-request", "Dates must be valid calendar dates", false);
  }
  if (query.returnDate && query.returnDate < query.departureDate) {
    throw new LiveFlightProviderError("invalid-request", "Return date cannot be before departure date", false);
  }
  if (!Number.isSafeInteger(query.adults) || query.adults < 1 || query.adults > 9) {
    throw new LiveFlightProviderError("invalid-request", "Adults must be an integer from 1 to 9", false);
  }
  if (query.maxResults !== undefined && (!Number.isSafeInteger(query.maxResults) || query.maxResults < 1 || query.maxResults > 250)) {
    throw new LiveFlightProviderError("invalid-request", "maxResults must be an integer from 1 to 250", false);
  }
  if (query.currencyCode !== undefined && !/^[A-Z]{3}$/.test(query.currencyCode)) {
    throw new LiveFlightProviderError("invalid-request", "currencyCode must be a three-letter uppercase code", false);
  }
}

function toSearchParams(query: LiveFlightSearchQuery): URLSearchParams {
  const params = new URLSearchParams({
    originLocationCode: query.originIataCode,
    destinationLocationCode: query.destinationIataCode,
    departureDate: query.departureDate,
    adults: String(query.adults),
  });
  if (query.returnDate) params.set("returnDate", query.returnDate);
  if (query.currencyCode) params.set("currencyCode", query.currencyCode);
  if (query.nonStop !== undefined) params.set("nonStop", String(query.nonStop));
  if (query.maxResults !== undefined) params.set("max", String(query.maxResults));
  return params;
}

function normalizeOffer(value: unknown, index: number, providerId: string, fetchedAt: string): LiveFlightOffer {
  if (!isRecord(value)) throw malformed(`offer ${index}`);
  const sourceRecordId = requiredString(value.id, "offer id");
  const price = requiredRecord(value.price, "offer price");
  const itineraries = getArray(value, "itineraries");
  const normalizedItineraries = itineraries.map((itinerary, itineraryIndex) => {
    const record = requiredRecord(itinerary, `itinerary ${itineraryIndex}`);
    const itinerarySegments = getArray(record, "segments").map((segment, segmentIndex) =>
      normalizeSegment(segment, `${sourceRecordId}-${itineraryIndex}-${segmentIndex}`));
    if (itinerarySegments.length === 0) throw malformed("itinerary segments");
    const durationMinutes = Math.round((
      Date.parse(itinerarySegments.at(-1)!.arrivalAt) - Date.parse(itinerarySegments[0].departureAt)
    ) / 60_000);
    if (!Number.isFinite(durationMinutes) || durationMinutes <= 0) throw malformed("itinerary chronology");
    return { segments: itinerarySegments, durationMinutes };
  });
  const segments = normalizedItineraries.flatMap(({ segments: itinerarySegments }) => itinerarySegments);
  if (segments.length === 0) throw malformed("offer segments");
  return {
    id: `${providerId}:${sourceRecordId}`,
    providerId,
    dataSource: "live",
    sourceRecordId,
    fetchedAt,
    ...(typeof value.lastTicketingDate === "string" ? { lastTicketingDate: value.lastTicketingDate } : {}),
    currencyCode: requiredString(price.currency, "price currency"),
    totalPrice: decimalString(price.grandTotal ?? price.total, "total price"),
    ...(price.base === undefined ? {} : { basePrice: decimalString(price.base, "base price") }),
    totalDurationMinutes: normalizedItineraries.reduce((total, itinerary) => total + itinerary.durationMinutes, 0),
    transfers: Math.max(0, segments.length - itineraries.length),
    validatingAirlineCodes: stringArray(value.validatingAirlineCodes),
    segments,
    ...(value.numberOfBookableSeats === undefined ? {} : { bookableSeats: positiveInteger(value.numberOfBookableSeats, "bookable seats") }),
  };
}

function normalizeSegment(value: unknown, id: string): LiveFlightSegment {
  const segment = requiredRecord(value, "segment");
  const departure = requiredRecord(segment.departure, "segment departure");
  const arrival = requiredRecord(segment.arrival, "segment arrival");
  const departureAt = requiredString(departure.at, "departure time");
  const arrivalAt = requiredString(arrival.at, "arrival time");
  const durationMinutes = Math.round((Date.parse(arrivalAt) - Date.parse(departureAt)) / 60_000);
  if (!Number.isFinite(durationMinutes) || durationMinutes <= 0) throw malformed("segment chronology");
  return {
    id,
    departureIataCode: requiredString(departure.iataCode, "departure IATA code"),
    departureAt,
    ...(typeof departure.terminal === "string" ? { departureTerminal: departure.terminal } : {}),
    arrivalIataCode: requiredString(arrival.iataCode, "arrival IATA code"),
    arrivalAt,
    ...(typeof arrival.terminal === "string" ? { arrivalTerminal: arrival.terminal } : {}),
    marketingCarrierCode: requiredString(segment.carrierCode, "carrier code"),
    flightNumber: requiredString(segment.number, "flight number"),
    durationMinutes,
  };
}

async function readJson(response: Response): Promise<unknown> {
  try { return await response.json(); } catch (error) {
    throw new LiveFlightProviderError("invalid-response", "Amadeus returned non-JSON data", false, { cause: error });
  }
}

function responseError(status: number, payload: unknown): LiveFlightProviderError {
  const message = extractErrorMessage(payload) ?? `Amadeus returned HTTP ${status}`;
  if (status === 400) return new LiveFlightProviderError("invalid-request", message, false);
  if (status === 401 || status === 403) return new LiveFlightProviderError("authentication", message, false);
  if (status === 429) return new LiveFlightProviderError("rate-limit", message, true);
  return new LiveFlightProviderError("upstream", message, status >= 500);
}

function extractErrorMessage(payload: unknown): string | undefined {
  if (!isRecord(payload)) return undefined;
  if (typeof payload.error_description === "string") return payload.error_description;
  if (Array.isArray(payload.errors) && isRecord(payload.errors[0]) && typeof payload.errors[0].detail === "string") return payload.errors[0].detail;
  return undefined;
}

function isTransient(status: number): boolean { return status === 429 || status >= 500; }
function isCalendarDate(value: string): boolean {
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
}
function malformed(field: string): LiveFlightProviderError { return new LiveFlightProviderError("invalid-response", `Malformed Amadeus ${field}`, false); }
function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === "object" && value !== null && !Array.isArray(value); }
function requiredRecord(value: unknown, field: string): Record<string, unknown> { if (!isRecord(value)) throw malformed(field); return value; }
function requiredString(value: unknown, field: string): string { if (typeof value !== "string" || value === "") throw malformed(field); return value; }
function getArray(value: unknown, field: string): unknown[] { const record = requiredRecord(value, field); const array = record[field]; if (!Array.isArray(array)) throw malformed(field); return array; }
function stringArray(value: unknown): string[] { if (value === undefined) return []; if (!Array.isArray(value) || !value.every((item) => typeof item === "string")) throw malformed("string array"); return value; }
function decimalString(value: unknown, field: string): string { const result = requiredString(value, field); if (!/^\d+(\.\d+)?$/.test(result)) throw malformed(field); return result; }
function positiveInteger(value: unknown, field: string): number { if (!Number.isSafeInteger(value) || Number(value) < 0) throw malformed(field); return Number(value); }
