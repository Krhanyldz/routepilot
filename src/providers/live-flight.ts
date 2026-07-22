export interface LiveFlightSearchQuery {
  originIataCode: string;
  destinationIataCode: string;
  departureDate: string;
  returnDate?: string;
  adults: number;
  currencyCode?: string;
  nonStop?: boolean;
  maxResults?: number;
}

export interface LiveFlightSegment {
  id: string;
  departureIataCode: string;
  departureAt: string;
  departureTerminal?: string;
  arrivalIataCode: string;
  arrivalAt: string;
  arrivalTerminal?: string;
  marketingCarrierCode: string;
  flightNumber: string;
  durationMinutes: number;
}

export interface LiveFlightOffer {
  id: string;
  providerId: string;
  dataSource: "live";
  sourceRecordId: string;
  fetchedAt: string;
  lastTicketingDate?: string;
  currencyCode: string;
  totalPrice: string;
  basePrice?: string;
  totalDurationMinutes: number;
  transfers: number;
  validatingAirlineCodes: readonly string[];
  segments: readonly LiveFlightSegment[];
  bookableSeats?: number;
}

export interface LiveFlightSearchResult {
  providerId: string;
  fetchedAt: string;
  offers: readonly LiveFlightOffer[];
  warnings: readonly string[];
  coverage: "complete" | "provider-limited";
}

export interface LiveFlightSearchProvider {
  readonly id: string;
  searchFlights(query: LiveFlightSearchQuery): Promise<LiveFlightSearchResult>;
}

export type LiveFlightProviderErrorCode =
  | "invalid-request"
  | "authentication"
  | "rate-limit"
  | "timeout"
  | "upstream"
  | "invalid-response";

export class LiveFlightProviderError extends Error {
  constructor(
    readonly code: LiveFlightProviderErrorCode,
    message: string,
    readonly retryable: boolean,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = "LiveFlightProviderError";
  }
}
