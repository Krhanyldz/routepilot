# Amadeus Flight Provider

RoutePilot includes a server-side Amadeus Self-Service adapter foundation for Flight Offers Search. It is not connected to the UI or current deterministic route flow yet, and no credentials are committed.

## Official API contract

The adapter follows the official Amadeus Self-Service flow:

1. Obtain an OAuth2 client-credentials token with `POST /v1/security/oauth2/token`.
2. Search with `GET /v2/shopping/flight-offers`.
3. Send the access token as a bearer token.

Test uses `https://test.api.amadeus.com`; production uses `https://api.amadeus.com`. Tokens are cached in memory until one minute before their reported expiry. Amadeus currently documents token validity as 30 minutes.

Official references:

- [Authorization guide](https://developers.amadeus.com/self-service/apis-docs/guides/developer-guides/API-Keys/authorization/)
- [Flight APIs tutorial](https://developers.amadeus.com/self-service/apis-docs/guides/developer-guides/resources/flights/)
- [Test data guide](https://developers.amadeus.com/self-service/apis-docs/guides/developer-guides/test-data/)

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

## Operational behavior

- Requests have an eight-second total timeout.
- One retry is allowed for idempotent search reads returning HTTP 429 or 5xx.
- Invalid input, authentication failures, and malformed payloads are not retried.
- OAuth tokens and secrets are server-only concerns and must never be sent to UI or AI layers.
- Fetch uses `no-store` until a provider-terms-compliant shared cache is designed.

## Coverage limitation

Amadeus documents that Self-Service Flight Offers Search does not include some low-cost carriers and certain major airlines. Every normalized result therefore carries `provider-limited` coverage and a warning. RoutePilot must describe ranking as the cheapest among returned offers, not the cheapest flight on the whole market.

## Current limitations and next steps

- The adapter is not wired into an application search endpoint.
- No real credential or live request is exercised in automated tests.
- Baggage and detailed fare rules require additional Amadeus pricing/confirmation flows.
- Rate-limit headers, `Retry-After`, shared cache, request coalescing, circuit breaking, and health telemetry remain future work.
- Booking redirects are not generated; unsupported deep links must not be fabricated.
