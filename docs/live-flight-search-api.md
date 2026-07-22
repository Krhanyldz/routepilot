# Live Flight Search API

`POST /api/flights/search` is the server-only application boundary for live flight inventory. It is dynamic, uses the Node.js runtime, and never exposes Amadeus credentials to the browser.

## Request

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

Unknown fields and invalid types, airport codes, calendar dates, date order, traveler counts, currency codes, or result limits are rejected before any provider call.

## Response states

- `200 success`: normalized live provider evidence.
- `400 invalid-request`: invalid JSON or structured input.
- `413 payload-too-large`: body exceeds the fixed limit.
- `415 unsupported-content-type`: request is not JSON.
- `429 request-rate-limit`: the per-instance request window is exhausted; includes `Retry-After`.
- `502 failure`: upstream or malformed provider response.
- `504 timeout`: provider deadline exceeded.
- `503 unavailable`: live mode is disabled or provider credentials/configuration are missing.

Every response includes a request ID, `Cache-Control: no-store`, and `X-Content-Type-Options: nosniff`. Provider details and secret-bearing upstream messages are not returned.

## Demo and live separation

When `ROUTE_DATA_MODE=demo`, this endpoint returns `live-mode-disabled`. It does not return or rank deterministic demo fixtures as if they were live inventory. When live configuration is invalid, it returns `provider-misconfigured` without exposing which credential is absent.

## Rate limiting

The MVP includes a bounded in-memory fixed-window limiter of 20 requests per minute per forwarded client IP. It expects the production ingress proxy to overwrite `X-Forwarded-For`; deployments must not trust a client-controlled forwarded header.

The in-memory limiter is defense in depth only. Multi-instance or serverless production deployment requires a shared gateway or distributed rate limiter before enabling paid provider credentials. This remains a deployment blocker for public high-volume access.

## Integration status

The API boundary is ready and tested, but the current public page remains the labeled deterministic demo. Wiring public search controls to live inventory requires Amadeus test credentials, canonical airport-to-IATA resolution in the application use case, and deployment-level distributed rate limiting.
