import {
  LiveFlightProviderError,
  type LiveFlightSearchProvider,
  type LiveFlightSearchQuery,
  type LiveFlightSearchResult,
} from "@/providers/live-flight";

export type LiveFlightSearchOutcome =
  | { status: "success"; result: LiveFlightSearchResult }
  | { status: "unavailable"; reason: "live-mode-disabled" | "provider-misconfigured" }
  | { status: "failure"; reason: "rate-limit" | "timeout" | "upstream" | "invalid-response" };

export interface LiveFlightSearchDependencies {
  provider: LiveFlightSearchProvider | null;
  configured: boolean;
}

export async function executeLiveFlightSearch(
  query: LiveFlightSearchQuery,
  dependencies: LiveFlightSearchDependencies,
): Promise<LiveFlightSearchOutcome> {
  if (!dependencies.configured) return { status: "unavailable", reason: "live-mode-disabled" };
  if (!dependencies.provider) return { status: "unavailable", reason: "provider-misconfigured" };
  try {
    return { status: "success", result: await dependencies.provider.searchFlights(query) };
  } catch (error) {
    if (!(error instanceof LiveFlightProviderError)) return { status: "failure", reason: "upstream" };
    if (error.code === "invalid-request") throw error;
    if (error.code === "authentication") return { status: "unavailable", reason: "provider-misconfigured" };
    return { status: "failure", reason: error.code };
  }
}

export function parseLiveFlightSearchQuery(value: unknown): LiveFlightSearchQuery {
  if (!isRecord(value)) throw invalid("Request body must be a JSON object");
  const allowedFields = new Set([
    "originIataCode", "destinationIataCode", "departureDate", "returnDate",
    "adults", "currencyCode", "nonStop", "maxResults",
  ]);
  if (Object.keys(value).some((field) => !allowedFields.has(field))) throw invalid("Request body contains unsupported fields");
  const query: LiveFlightSearchQuery = {
    originIataCode: stringField(value.originIataCode, "originIataCode"),
    destinationIataCode: stringField(value.destinationIataCode, "destinationIataCode"),
    departureDate: stringField(value.departureDate, "departureDate"),
    adults: numberField(value.adults, "adults"),
    ...(value.returnDate === undefined ? {} : { returnDate: stringField(value.returnDate, "returnDate") }),
    ...(value.currencyCode === undefined ? {} : { currencyCode: stringField(value.currencyCode, "currencyCode") }),
    ...(value.nonStop === undefined ? {} : { nonStop: booleanField(value.nonStop, "nonStop") }),
    ...(value.maxResults === undefined ? {} : { maxResults: numberField(value.maxResults, "maxResults") }),
  };
  validateQuery(query);
  return query;
}

function validateQuery(query: LiveFlightSearchQuery): void {
  if (!/^[A-Z]{3}$/.test(query.originIataCode) || !/^[A-Z]{3}$/.test(query.destinationIataCode)) {
    throw invalid("Airport codes must be three-letter uppercase IATA codes");
  }
  if (!isCalendarDate(query.departureDate) || (query.returnDate && !isCalendarDate(query.returnDate))) {
    throw invalid("Dates must be valid YYYY-MM-DD calendar dates");
  }
  if (query.returnDate && query.returnDate < query.departureDate) throw invalid("Return date cannot be before departure date");
  if (!Number.isSafeInteger(query.adults) || query.adults < 1 || query.adults > 9) throw invalid("Adults must be from 1 to 9");
  if (query.currencyCode !== undefined && !/^[A-Z]{3}$/.test(query.currencyCode)) throw invalid("Invalid currency code");
  if (query.maxResults !== undefined && (!Number.isSafeInteger(query.maxResults) || query.maxResults < 1 || query.maxResults > 250)) {
    throw invalid("maxResults must be from 1 to 250");
  }
}

function isCalendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
}

function invalid(message: string): LiveFlightProviderError {
  return new LiveFlightProviderError("invalid-request", message, false);
}

function stringField(value: unknown, field: string): string {
  if (typeof value !== "string") throw invalid(`${field} must be a string`);
  return value;
}

function numberField(value: unknown, field: string): number {
  if (typeof value !== "number") throw invalid(`${field} must be a number`);
  return value;
}

function booleanField(value: unknown, field: string): boolean {
  if (typeof value !== "boolean") throw invalid(`${field} must be a boolean`);
  return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
