# Live Flight Search API

`POST /api/flights/search` is the provider-independent application boundary for real-time flight inventory. The boundary remains available so an approved provider adapter can be added without changing routing or UI business logic.

## Current capability

TravelPayouts is RoutePilot's only flight-data provider. The configured Data API supplies cached reference and deal data, not the real-time priced itineraries required by `LiveFlightSearchProvider`. RoutePilot therefore returns:

```json
{ "status": "unavailable", "reason": "provider-capability-unavailable" }
```

with HTTP `503` for every otherwise valid flight search. It never converts cached Data API prices into live offers and never falls back to demo fares.

TravelPayouts offers a separate Aviasales Flight Search API, but access requires provider approval and additional integration metadata. Until that access is granted, real-time flight search is an explicit public-beta blocker.

## Request contract

The endpoint accepts `application/json` with a maximum encoded body size of 16 KiB:

```json
{
  "originIataCode": "HAM",
  "destinationIataCode": "AYT",
  "departureDate": "2026-09-10",
  "returnDate": "2026-09-17",
  "adults": 1,
  "currencyCode": "EUR",
  "nonStop": false,
  "maxResults": 20
}
```

Unknown fields and invalid types, airport codes, dates, date order, traveler counts, currency codes, or result limits are rejected before provider orchestration.

## Response states

- `200 success`: reserved for normalized, verified live provider evidence.
- `400 invalid-request`: invalid JSON or structured input.
- `413 payload-too-large`: body exceeds the fixed limit.
- `415 unsupported-content-type`: request is not JSON.
- `429 request-rate-limit`: the request window is exhausted.
- `503 provider-capability-unavailable`: TravelPayouts live search access is not integrated.
- `503 request-protection-unavailable`: distributed protection is unavailable on Vercel.

Every response includes correlation headers and `Cache-Control: no-store`. Provider secrets and upstream messages are never returned.

## Production request protection

Vercel deployments fail closed unless `RATE_LIMIT_BACKEND=upstash` and the Upstash credentials are valid. Client addresses are HMAC-SHA256 pseudonyms before leaving the process. Local development may use the bounded in-memory backend.

Required Vercel variables:

```text
RATE_LIMIT_BACKEND=upstash
UPSTASH_REDIS_REST_URL=...
UPSTASH_REDIS_REST_TOKEN=...
RATE_LIMIT_KEY_SECRET=...
```

The existing provider contract must be implemented only after TravelPayouts grants Flight Search API access. The adapter must normalize provider evidence and must not alter the routing engine's public interfaces.
