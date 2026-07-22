# RoutePilot

RoutePilot is a provider-independent multimodal journey platform. The public search uses worldwide Travelpayouts city and airport reference data and keeps IATA codes as the internal location identity.

## Runtime data

- Location autocomplete: Travelpayouts Data API
- Flight inventory: unavailable until TravelPayouts grants separate Flight Search API access
- Supported transport domain modes: flight, train, and ferry
- Bus transport is intentionally unsupported

There is no runtime hardcoded airport catalog. If Travelpayouts is missing or unavailable, the location endpoint returns an explicit safe error instead of demo data.

## Architecture

```text
app/components → application use cases → routing + pricing + explanations
                                      → provider interfaces → production adapters
domain models ← all non-UI layers
```

- `src/domain`: normalized locations, offers, routes, and constraints.
- `src/providers/production/travelpayouts`: server-only worldwide city and airport data.
- `src/app/api/locations/search`: validated, rate-limited autocomplete boundary.
- `src/app/api/flights/search`: validated, rate-limited flight inventory boundary.
- `src/routing`: deterministic geographic and graph algorithms.
- `src/knowledge-graph`: provider-independent topology validation and persistence.
- `src/server`: request protection, security policy, tracing, and observability.

## Environment

Copy `.env.example` to `.env.local`. Required for worldwide autocomplete:

```text
TRAVELPAYOUTS_API_TOKEN=
```

Distributed production protection variables are documented in the operations guide. Secrets must remain server-side and must never be committed.

## Development and verification

```bash
npm install
npm run dev
npm run lint
npm run typecheck
npm test
npm run build
```

## Documentation

- [Product requirements](docs/product-requirements.md)
- [Architecture roadmap](docs/roadmap.md)
- [Global Location Engine](docs/location-engine.md)
- [Travelpayouts Location Provider](docs/travelpayouts-location-provider.md)
- [TravelPayouts provider migration](docs/travelpayouts-provider-migration.md)
- [Live Flight Search API](docs/live-flight-search-api.md)
- [Live Location Search API](docs/live-location-search-api.md)
- [Production operations](docs/production-operations.md)
- [Security review](docs/security-review.md)
- [Release evidence](docs/release-evidence.md)

## Current limitations

- Live multimodal rail, ferry, and positioning inventory is not yet integrated.
- TravelPayouts Data API does not provide the real-time itinerary inventory required by the live flight contract.
- RoutePilot does not book, sell, or hold tickets.
- Authentication, persistence, payments, and user accounts are outside the current MVP.
