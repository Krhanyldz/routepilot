# RoutePilot

RoutePilot is a provider-independent multimodal journey platform. The public search uses worldwide Travelpayouts city and airport reference data and keeps IATA codes as the internal location identity.

## Runtime data

- Location autocomplete: Travelpayouts Data API
- Flight inventory: optional Amadeus Self-Service integration
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
- `src/providers/production/amadeus`: server-only OAuth and flight inventory.
- `src/app/api/locations/search`: validated, rate-limited autocomplete boundary.
- `src/app/api/flights/search`: validated, rate-limited flight inventory boundary.
- `src/routing`: deterministic geographic and graph algorithms.
- `src/knowledge-graph`: provider-independent topology validation and persistence.
- `src/server`: request protection, provider budgets, security policy, tracing, and observability.

## Environment

Copy `.env.example` to `.env.local`. Required for worldwide autocomplete:

```text
TRAVELPAYOUTS_API_TOKEN=
```

Amadeus and distributed production protection variables are documented in the provider and operations guides. Secrets must remain server-side and must never be committed.

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
- [Amadeus Flight Provider](docs/amadeus-flight-provider.md)
- [Live Flight Search API](docs/live-flight-search-api.md)
- [Live Location Search API](docs/live-location-search-api.md)
- [Production operations](docs/production-operations.md)
- [Security review](docs/security-review.md)
- [Release evidence](docs/release-evidence.md)

## Current limitations

- Live multimodal rail, ferry, and positioning inventory is not yet integrated.
- Travelpayouts and Amadeus coverage is provider-limited.
- RoutePilot does not book, sell, or hold tickets.
- Authentication, persistence, payments, and user accounts are outside the current MVP.
