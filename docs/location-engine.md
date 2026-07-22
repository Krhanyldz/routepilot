# Global Location Engine

## Purpose and current status

The Global Location Engine gives RoutePilot a provider-independent foundation for resolving cities and transport hubs and discovering practical departure candidates. The public autocomplete composes this model with worldwide Travelpayouts city and airport data.

No real API is connected. All included location-engine records are visibly sourced from `demo-global-locations` and must not be presented as live data.

## Architecture

```text
geocoding / location providers
             ↓
validated CanonicalLocation records
             ↓
source-aware canonical deduplication
             ↓
nearby candidate discovery
             ↓
deterministic ground estimates and filters
             ↓
ranked departure candidates for the route engine
```

The location engine discovers candidate nodes. It does not create transport offers, prices, or routes. The routing engine remains responsible for deciding which provider-backed connections form a valid journey.

## Canonical location model

`CanonicalLocation` supports exactly four location types:

- `city`
- `airport`
- `railway-station`
- `ferry-terminal`

Every entity has a stable RoutePilot ID, name, parent city, ISO alpha-2 country code, coordinates, IANA timezone, type, aliases, source metadata, and last-updated timestamp. Airports may carry an IATA code, railway stations a station code, and ferry terminals a port code.

Canonical IDs use this format:

```text
loc:{location-type}:{country-code}:{canonical-code-or-slug}
```

For example, Hamburg Airport is `loc:airport:de:ham`. The ID is derived from normalized identity rather than a provider record ID, so provider replacement does not rename the entity. IDs are lowercase and immutable after publication; merges redirect aliases to the surviving canonical ID rather than reusing an ID for another place.

Coordinates must be finite and within geographic bounds. Country codes, timestamps, source records, canonical IDs, and optional transport codes are validated at ingestion. `lastUpdatedAt` describes the most recent accepted entity update. Each source also carries its own retrieval time so cache age is not confused with factual freshness.

## Provider interfaces

The provider layer defines independent contracts for:

- Text geocoding.
- Nearby typed-location search.
- Airport search.
- Railway station search.
- Ferry terminal search.

Interfaces return normalized canonical records and expose a source ID. Routing depends on these interfaces rather than a provider implementation. Production adapters live under `src/providers/production`.

There is intentionally no bus provider or bus location type.

## Source precedence

Deduplication receives an explicit ordered list of source IDs. Lower list position has higher precedence. A production policy should generally prefer:

1. Contracted authoritative transport-hub or national infrastructure sources.
2. Official operator or airport/station/port sources.
3. Established location aggregators.
4. Carefully reviewed internal corrections.
5. Demo data, only in demo environments.

Precedence chooses the primary name and coordinates; it does not discard provenance. All unique source references are retained. The merged `lastUpdatedAt` is the latest accepted entity timestamp. A source with newer retrieval time does not automatically outrank a more authoritative source.

Conflicting strong codes, countries, or location types must not be auto-merged. Material coordinate or timezone conflicts should be quarantined for review when real providers are introduced.

## Deduplication rules

Records are grouped only when there is deterministic identity evidence:

1. Airports: same type, country, and normalized IATA code.
2. Railway stations: same type, country, and normalized station code.
3. Ferry terminals: same type, country, and normalized port code.
4. Records without strong codes: same type, country, normalized city/name, and coordinates rounded to three decimal places.

Within a group, source precedence selects the primary record. Alternate names become aliases, source references are unioned, and a coded canonical ID is regenerated from the shared code. Different transport-hub types are never merged, even when they share a city or geographic complex.

Future production deduplication should add reviewed crosswalks, parent-complex relationships, redirects, and conflict telemetry rather than relying on fuzzy matching alone.

## Candidate departure discovery

The discovery service accepts:

- A canonical origin.
- An optional radius in kilometers.
- An optional maximum ground-travel duration.
- Allowed transport modes: flight, train, and ferry.
- A nearby-location provider.
- A deterministic ground-positioning estimator.
- Source-precedence policy.

Transport modes map to airport, railway-station, and ferry-terminal candidates. Cities are geocoding entities, not departure candidates. Provider results are deduplicated, and radius filtering is applied again locally so an over-returning provider cannot bypass constraints.

When a maximum ground duration is present, candidates without a deterministic estimate are excluded. Remaining candidates are ordered by straight-line distance, then positioning cost, then canonical ID for stable ties. Cost is not guessed: it arrives from the injected estimator with duration and currency. This candidate ordering does not replace final route scoring.

## Cache strategy

Future adapters should use server-side caching with keys containing provider, adapter/schema version, normalized query, country filters, location types, coordinates rounded only to an approved cache precision, radius, and result limit.

- Canonical locations: long-lived cache with periodic refresh and explicit invalidation for closures, renames, code changes, timezone corrections, and coordinate corrections.
- Geocoding queries: moderate TTL; retain normalized query and locale/country scope.
- Nearby searches: moderate TTL because the underlying hub catalog changes slowly.
- Ground duration and cost: separate, shorter TTLs appropriate to their source and travel-time assumptions.

Cache entries retain provider retrieval time and entity `lastUpdatedAt`. Stale-while-revalidate may serve location identity for a bounded period, but stale or missing ground estimates must be disclosed or excluded under strict duration constraints. Cache retention must comply with provider terms.

## Future real providers

No vendor is selected. Candidate categories for later evaluation include:

- Government or standards-based geocoding/location datasets.
- Aviation location sources with stable airport identity and operational status.
- National or regional railway infrastructure datasets.
- Port authority or ferry schedule location datasets.
- Ground-routing providers for actual access duration and cost evidence.

Provider selection requires coverage analysis, licensing and attribution review, stable identifiers, update cadence, rate limits, cost, service health, and permission to cache and derive canonical mappings. A real adapter must label its actual source and never masquerade as a live integration before credentials and contract-compliant calls exist.

## Limitations

- The catalog is small, deterministic demo data centered on Bremen.
- Candidate radius is straight-line Haversine distance, not road or rail distance.
- Demo ground estimates are deterministic test inputs, not live journeys or fares.
- Ranking is distance-first with positioning cost as a tie-breaker; final route value remains a routing/scoring concern.
- No multilingual search, fuzzy typo matching, hierarchy of terminal complexes, accessibility metadata, operational status, or historical redirects exist yet.
- Code-based deduplication cannot resolve missing, recycled, incorrect, or provider-conflicting codes without reviewed crosswalks.
- The new engine is not wired into the current UI or demo route flow, preserving existing behavior while the foundation is evaluated.
