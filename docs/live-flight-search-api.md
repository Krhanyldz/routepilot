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
- `429 request-rate-limit`: the request window is exhausted; includes `Retry-After`.
- `502 failure`: upstream or malformed provider response.
- `504 timeout`: provider deadline exceeded.
- `503 unavailable`: live mode, provider credentials, request protection, or the distributed rate-limit service is unavailable.

Every response includes a request ID, `Cache-Control: no-store`, and `X-Content-Type-Options: nosniff`. Provider details and secret-bearing upstream messages are not returned.

## Demo and live separation

When `ROUTE_DATA_MODE=demo`, this endpoint returns `live-mode-disabled`. It does not return or rank deterministic demo fixtures as if they were live inventory. When live configuration is invalid, it returns `provider-misconfigured` without exposing which credential is absent.

## Rate limiting

The provider-independent request-protection contract supports two backends:

- `memory`: a bounded fixed window for local development and deterministic demo environments;
- `upstash`: a shared sliding window backed by Upstash Redis for multi-instance and serverless deployment.

Production live mode fails closed unless `RATE_LIMIT_BACKEND=upstash` and all Upstash credentials are configured. A Redis failure returns `503 request-protection-unavailable`; it never silently falls back to process memory. Client addresses are HMAC-SHA256 pseudonyms before they leave the application process, using a deployment-only `RATE_LIMIT_KEY_SECRET` of at least 32 characters.

The endpoint expects the production ingress proxy to overwrite `X-Forwarded-For`; deployments must not trust a directly client-controlled forwarded header. The limit remains 20 searches per minute per pseudonymous client identifier.

Required production live variables:

```text
RATE_LIMIT_BACKEND=upstash
UPSTASH_REDIS_REST_URL=...
UPSTASH_REDIS_REST_TOKEN=...
RATE_LIMIT_KEY_SECRET=...
```

## Integration status

The API boundary and distributed request protection are ready and tested, but the current public page remains the labeled deterministic demo. Wiring public search controls to live inventory requires Amadeus test credentials, Upstash credentials, and canonical airport-to-IATA resolution in the application use case.
