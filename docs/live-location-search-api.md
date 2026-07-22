# Live Location Search API

`GET /api/locations/search` is the server-only autocomplete boundary for the Travelpayouts worldwide City and Airport Data API. It shares RoutePilot request protection with flight search and never exposes provider credentials.

## Query

- `query`: required, 2–80 characters.
- `kind`: `airport` or `city-and-airport`; defaults to both.
- `countryCodes`: optional comma-separated uppercase ISO alpha-2 codes, maximum five.
- `limit`: optional integer from 1 to 20; defaults to 10.

Unknown parameters, invalid values, or URLs longer than 2,048 characters are rejected before provider access.

## Responses

- `200 success`: canonical cities and airports with internal IATA codes.
- `400 invalid-request`: malformed query.
- `414 uri-too-long`: request URL exceeds the fixed limit.
- `429 request-rate-limit`: the client request window is exhausted.
- `502/504 failure`: normalized Travelpayouts failure or timeout.
- `503 unavailable`: missing token or unavailable request protection.

All responses are non-cacheable, include request and trace correlation, and omit upstream messages. There is no hardcoded location fallback.

## Runtime behavior

The first valid search loads Travelpayouts' city and airport reference datasets together. A successful normalized dataset is shared for subsequent autocomplete requests in the server process. A failed load is discarded so a later request can recover. Deployment requires `TRAVELPAYOUTS_API_TOKEN`.
