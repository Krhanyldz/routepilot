# TravelPayouts provider consolidation

## Decision

TravelPayouts is RoutePilot's primary and only flight-data provider. The codebase retains provider-independent contracts so a future provider can be added without changing domain or routing business logic, but it does not maintain an unused parallel adapter.

## Amadeus usage classification

| Previous usage | Classification | Migration result |
|---|---|---|
| `LiveFlightSearchProvider` and normalized live offer model | Required | Retained as provider-independent application/domain contracts |
| Airport/city autocomplete | Replaceable | Replaced by the existing TravelPayouts Data API location adapter |
| Flight Offers Search implementation | Replaceable only with approved equivalent | Amadeus adapter removed; endpoint reports explicit capability unavailability until TravelPayouts Flight Search API access is granted |
| OAuth client, token cache, Amadeus config and environment selection | Obsolete | Removed |
| Amadeus-specific location normalization and timezone dependency | Obsolete | Removed |
| Amadeus request-cost/TPS budget gate | Obsolete | Removed; general client abuse protection remains |
| Amadeus tests, documentation, deployment variables and coverage warnings | Obsolete | Removed or replaced with TravelPayouts capability documentation |

## Replaced functionality

- Worldwide city and airport autocomplete uses TravelPayouts Data API.
- Canonical IATA codes remain the internal location identity.
- Missing or failed location data returns a typed safe error; no hardcoded airport catalog is used.
- The flight endpoint preserves validation, correlation, safe error handling, request protection, and normalized provider boundaries.

## Missing TravelPayouts capability

The standard TravelPayouts Data API exposes cached reference and price/deal data. It is not equivalent to real-time, bookable itinerary search and must not be mapped to `LiveFlightOffer`.

TravelPayouts documents a separate Aviasales Flight Search API for real-time search. Access is granted separately and currently requires an established project meeting provider criteria. Until RoutePilot receives approval, live flight inventory remains unavailable by design.

No workaround, scraped result, cached fare, or demo record is substituted.

Official references:

- [Aviasales Flight Search API](https://support.travelpayouts.com/hc/en-us/articles/30565016140434-Aviasales-Flights-Search-API-real-time-and-multi-city-search)
- [Aviasales Data API](https://support.travelpayouts.com/hc/en-us/articles/203956163-Aviasales-Data-API)
- [Flight Search API access requirements](https://support.travelpayouts.com/hc/en-us/articles/210995808-Requirements-for-Flight-Search-API-access)

## Remaining provider abstractions

- `AirportSearchProvider` and `GeocodingProvider` isolate location ingestion.
- `LiveFlightSearchProvider` defines normalized real-time flight evidence.
- Routing, scoring, explanations, and UI depend on normalized contracts rather than provider payloads.
- TravelPayouts production adapters remain isolated under `src/providers/production/travelpayouts`.

## Credentials

Required now:

```text
TRAVELPAYOUTS_API_TOKEN=...
```

This token is server-only and supports the current Data API location adapter.

Future real-time flight integration additionally requires provider approval and the fields mandated by the Flight Search API, including the affiliate marker, approved website/application host, and compliant request-signing/client context. Exact environment names must be introduced only when the approved provider contract is implemented; speculative variables are intentionally absent.

## Removed dependencies and configuration

- `AMADEUS_CLIENT_ID`
- `AMADEUS_CLIENT_SECRET`
- `AMADEUS_ENVIRONMENT`
- `ROUTE_DATA_MODE`
- `PROVIDER_MAX_REQUESTS_PER_SECOND`
- `PROVIDER_MAX_REQUESTS_PER_DAY`
- `tz-lookup` and its type package

## Risks

1. The core live-flight result journey cannot launch until TravelPayouts grants Flight Search API access.
2. TravelPayouts Data API coverage and freshness are provider-limited and suitable only for autocomplete/reference use in the current adapter.
3. A single location provider creates an availability dependency; failures are explicit rather than silently degraded.
4. Production Vercel deployments require Upstash-backed request protection and fail closed without it.
5. Flight Search API eligibility and commercial terms are external decisions and may prevent an immediate public beta.
