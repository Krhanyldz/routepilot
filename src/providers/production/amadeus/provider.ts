import {
  LiveFlightProviderError,
  type LiveFlightOffer,
  type LiveFlightSearchProvider,
  type LiveFlightSearchQuery,
  type LiveFlightSearchResult,
  type LiveFlightSegment,
} from "@/providers/live-flight";
import type { AmadeusConfig } from "./config";
import { AmadeusApiClient, AmadeusApiError } from "./client";

type Fetch = typeof fetch;

export const AMADEUS_COVERAGE_WARNING =
  "Amadeus Self-Service coverage excludes some airlines and low-cost carriers; results are cheapest only among returned offers.";

export class AmadeusFlightProvider implements LiveFlightSearchProvider {
  readonly id = "amadeus-self-service";
  private readonly client: AmadeusApiClient;

  constructor(
    config: AmadeusConfig,
    fetchImpl: Fetch = fetch,
    private readonly now: () => number = Date.now,
  ) {
    this.client = new AmadeusApiClient(config, fetchImpl, now);
  }

  async searchFlights(query: LiveFlightSearchQuery): Promise<LiveFlightSearchResult> {
    validateQuery(query);
    const fetchedAt = new Date(this.now()).toISOString();
    let payload: unknown;
    try {
      payload = await this.client.get("/v2/shopping/flight-offers", toSearchParams(query));
    } catch (error) {
      if (error instanceof AmadeusApiError) {
        throw new LiveFlightProviderError(error.code, error.message, error.retryable, { cause: error });
      }
      throw error;
    }
    const records = getArray(payload, "data");
    return {
      providerId: this.id,
      fetchedAt,
      offers: records.map((record, index) => normalizeOffer(record, index, this.id, fetchedAt)),
      warnings: [AMADEUS_COVERAGE_WARNING],
      coverage: "provider-limited",
    };
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
