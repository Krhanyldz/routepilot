# Amadeus Flight Provider

RoutePilot uses its server-side Amadeus Self-Service adapter for Flight Offers Search. Worldwide public autocomplete is supplied separately by Travelpayouts. No provider credentials are committed.

## Official API contract

The adapter follows the official Amadeus Self-Service flow:

1. Obtain an OAuth2 client-credentials token with `POST /v1/security/oauth2/token`.
2. Search with `GET /v2/shopping/flight-offers`.
3. Resolve airports and cities with `GET /v1/reference-data/locations`.
4. Send the access token as a bearer token.

Test uses `https://test.api.amadeus.com`; production uses `https://api.amadeus.com`. Tokens are cached in memory until one minute before their reported expiry. Amadeus currently documents token validity as 30 minutes.

Official references:

- [Authorization guide](https://developers.amadeus.com/self-service/apis-docs/guides/developer-guides/API-Keys/authorization/)
- [Flight APIs tutorial](https://developers.amadeus.com/self-service/apis-docs/guides/developer-guides/resources/flights/)
- [Test data guide](https://developers.amadeus.com/self-service/apis-docs/guides/developer-guides/test-data/)
- [Rate limits](https://developers.amadeus.com/self-service/apis-docs/guides/developer-guides/api-rate-limits/)

## Configuration

Copy `.env.example` to a local environment file and keep the real values out of Git:

```text
ROUTE_DATA_MODE=live
AMADEUS_ENVIRONMENT=test
AMADEUS_CLIENT_ID=...
AMADEUS_CLIENT_SECRET=...
```

`ROUTE_DATA_MODE` defaults to `demo`. Live mode fails closed when either credential is missing. A live-provider error never silently activates demo results.

## Normalization

The adapter normalizes whole Amadeus itinerary offers rather than breaking a priced itinerary into independent purchasable edges. Normalized results retain provider and source IDs, fetch timestamp and last ticketing date, exact decimal price strings and currency, itinerary duration including connections, transfers, validating carriers, segment airports/times/terminals/carrier/flight number, and reported bookable seats.

Malformed required fields are rejected. The adapter does not invent baggage, booking protection, refundability, deep links, or missing prices.

## Airport and city normalization

`AmadeusLocationProvider` implements RoutePilot's provider-independent `AirportSearchProvider` and `GeocodingProvider` contracts. It maps provider records to canonical city and airport entities with stable IDs, coordinates, IATA codes, aliases, source metadata, and retrieval timestamps.

Amadeus returns a UTC offset rather than an IANA timezone identifier. RoutePilot derives the IANA timezone deterministically from the returned coordinates using the bundled `tz-lookup` dataset; it neither invents a timezone nor performs an untracked second API request. Invalid coordinates, country codes, IATA codes, subtypes, or response shapes fail closed.

The provider endpoint accepts one country filter per request. A RoutePilot search containing multiple countries performs one request per unique country, deduplicates by canonical ID, and then applies the requested result limit.

## Operational behavior

- Requests have an eight-second total timeout.
- One retry is allowed for idempotent search reads returning HTTP 429 or 5xx.
- Invalid input, authentication failures, and malformed payloads are not retried.
- OAuth tokens and secrets are server-only concerns and must never be sent to UI or AI layers.
- Concurrent OAuth refreshes share one token request, and identical concurrent GETs share one upstream read. Completed reads are removed immediately rather than retained as an unapproved fare cache.
- Three exhausted retryable failures open a 30-second circuit. Requests fail fast while open; after the cooldown, a single half-open probe may restore traffic. Invalid requests and authentication failures do not trip the circuit.
- A provider-wide distributed gate paces test traffic to one request per 100 ms. Production requires explicit 1–40 TPS and positive daily request budgets and fails closed without either. The throughput limit follows Amadeus' documented ceiling; the daily limit is RoutePilot's operator-approved cost ceiling.
- Fetch uses `no-store` until a provider-terms-compliant shared cache is designed.

## Coverage limitation

Amadeus documents that Self-Service Flight Offers Search does not include some low-cost carriers and certain major airlines. Every normalized result therefore carries `provider-limited` coverage and a warning. RoutePilot must describe ranking as the cheapest among returned offers, not the cheapest flight on the whole market.

## Current limitations and next steps

- Airport and city search is exposed through a validated server-only autocomplete endpoint in live mode.
- No real credential or live request is exercised in automated tests.
- Baggage and detailed fare rules require additional Amadeus pricing/confirmation flows.
- Provider response caching and externally persisted runtime health telemetry remain future work.
- Booking redirects are not generated; unsupported deep links must not be fabricated.
