# Live Location Search API

`GET /api/locations/search` is the server-only autocomplete boundary for Amadeus Airport & City Search. It shares production request protection with live flight search and never exposes provider credentials.

## Query

- `query`: required, 2–40 characters.
- `kind`: `airport` or `city-and-airport`; defaults to both.
- `countryCodes`: optional comma-separated uppercase ISO alpha-2 codes, maximum five.
- `limit`: optional integer from 1 to 20; defaults to 10.

Unknown parameters, invalid values, or URLs longer than 2,048 characters are rejected before a provider call.

## Responses

- `200 success`: canonical live locations with source metadata.
- `400 invalid-request`: malformed query.
- `414 uri-too-long`: request URL exceeds the fixed limit.
- `429 request-rate-limit`: shared provider-search budget exhausted.
- `502/504 failure`: normalized provider failure or timeout.
- `503 unavailable`: demo mode, missing credentials, or unavailable request protection.

All responses are non-cacheable, include a request ID, and omit upstream error messages. Demo mode never returns demo locations from this live endpoint.

## Current boundary

The API is ready for autocomplete UI integration but requires Amadeus and Upstash deployment credentials in production live mode. The Amadeus test environment limits Airport & City Search coverage to specific countries, so production-like global autocomplete requires the Amadeus production environment.
