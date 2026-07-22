# Travelpayouts worldwide location provider

RoutePilot uses the official Travelpayouts Data API city and airport datasets:

- `GET https://api.travelpayouts.com/data/en/cities.json`
- `GET https://api.travelpayouts.com/data/en/airports.json`

The server sends `TRAVELPAYOUTS_API_TOKEN` in the `X-Access-Token` header. The token is never sent to the browser, included in a URL, logged, or committed.

## Search behavior

The provider downloads both datasets together, validates and normalizes usable records, and shares only a successful dataset within the server process. Failed loads are not cached, so a later request can recover. City names, airport names, translated aliases, city IATA codes, and airport IATA codes participate in deterministic autocomplete ranking.

The browser submits text to RoutePilot's own `/api/locations/search` endpoint. Results contain canonical RoutePilot IDs and three-character IATA codes. Flight searches submit only the selected IATA codes.

There is no hardcoded runtime fallback. Missing credentials, authentication errors, rate limits, timeouts, malformed data, and upstream failures return explicit safe errors.

## Configuration

```text
TRAVELPAYOUTS_API_TOKEN=
```

Deployment readiness reports `locationData: misconfigured` when the token is absent. Real API availability is verified separately because readiness does not consume provider requests.

## Provider limitations

Travelpayouts publishes cached reference datasets and recommends them for static-style usage. RoutePilot combines platform caching with an in-process shared successful load to avoid downloading the global files for each autocomplete request. Records without a valid IATA code, country, coordinates, or timezone are rejected rather than guessed.
