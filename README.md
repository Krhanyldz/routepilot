# RoutePilot

RoutePilot is a provider-independent multimodal routing MVP. It demonstrates how including the full positioning cost to a nearby departure airport can still reveal a substantially cheaper journey.

All current prices, schedules, and locations are deterministic demo data. There are no live transport API calls.

## Demo scenarios

### Bremen → Antalya

- Direct Bremen → Antalya flight: €300
- Bremen → Hamburg regional train: €0 with a Deutschlandticket, otherwise €20
- Hamburg → Antalya flight: €59

With a Deutschlandticket, RoutePilot recommends the Hamburg departure at €59 total and explains the €241 saving. Without one, the complete journey is €79 and saves €221.

### Bremen → Baotou

- Bremen → Hamburg regional train: €0 or €20
- Hamburg → Istanbul flight: €49
- Istanbul → Ürümqi flight: €240
- Ürümqi → Baotou train: €40
- Ürümqi → Baotou flight alternative: €75

The graph selects the €40 final train, producing a €329 total with a Deutschlandticket.

## Architecture

The UI does not calculate routes or prices. Responsibilities are split into focused layers:

```text
app/components → application use case → routing + pricing + explanations
                                      → provider interfaces → demo providers
domain models ← all non-UI layers
```

- `src/domain`: normalized locations, offers, routes, constraints, and the supported `flight`, `train`, and `ferry` modes.
- `src/domain/location.ts`: validated canonical cities, airports, railway stations, and ferry terminals for the Global Location Engine.
- `src/providers/interfaces.ts`: contracts for flight, train, ferry, and location search.
- `src/providers/demo`: visibly labeled local demo implementations and fixtures.
- `src/providers/production/amadeus`: opt-in server-side OAuth and Flight Offers Search adapter foundation.
- `src/providers/aggregate.ts`: merges normalized results from allowed provider types.
- `src/routing`: Haversine-based nearby discovery and constrained graph search.
- `src/routing/candidate-departures.ts`: provider-independent candidate discovery by radius, ground duration, mode, distance, and positioning cost.
- `src/knowledge-graph`: validates, queries, and atomically persists versioned transport topology snapshots independently of provider fares.
- `src/pricing`: Deutschlandticket and positioning-price policy.
- `src/explanations`: deterministic rules explaining savings, speed tradeoffs, rail savings, ticket effects, and self-transfer risk.
- `src/ai`: deterministic Travel Strategist orchestration over sanitized route-engine evidence; it does not calculate or rank routes.
- `src/application`: composes provider implementations for the current demo use case.
- `src/components`: small presentational search and result components.

## Nearby departure discovery

The Bremen origin is compared with the demo departure-point catalog: Bremen, Hamburg, Hannover, Münster/Osnabrück, Dortmund, and Amsterdam. Every location has an ID, name, city, country code, type, coordinates, and an applicable IATA or station code.

The Haversine formula calculates straight-line distance from Bremen. Only points inside the selected 50, 100, 150, or 250 km radius can receive a positioning connection and enter the route graph. Amsterdam remains in the provider catalog but is correctly excluded at the available radii because its real straight-line distance is about 285 km.

Disabling nearby search removes all positioning legs, so Bremen → Antalya falls back to the €300 direct demo flight. Duration, transfer, and allowed-mode limits are applied during graph exploration.

## Transport knowledge graph

The repository includes a versioned demo snapshot at `src/providers/demo/transport-knowledge-graph.json`. It contains canonical location entities and provider-independent connectivity edges; edges deliberately contain no price or availability because those remain provider offer concerns. The file repository validates referential integrity and supported modes, then uses atomic replacement when saving a new snapshot. It is a persistence foundation only and is not connected to a real API or the current demo search flow.

## Development and verification

```bash
npm install
npm run dev
```

Before completion, run:

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

## Product foundation

- [Product requirements](docs/product-requirements.md)
- [Roadmap](docs/roadmap.md)
- [AI strategy](docs/ai-strategy.md)
- [AI orchestration](docs/ai-orchestration.md)
- [Data provider strategy](docs/data-provider-strategy.md)
- [Global Location Engine](docs/location-engine.md)
- [Amadeus Flight Provider](docs/amadeus-flight-provider.md)
- [Dependency security](docs/dependency-security.md)
- [Continuous integration](docs/continuous-integration.md)

## Current limitations

- All fares, durations, and availability are fixed demo records rather than live inventory.
- The Amadeus live adapter foundation is not wired into the UI or deterministic route search yet.
- Distance radius is straight-line distance; it is not ground travel distance or duration.
- Connection duration does not yet include configurable minimum connection or overnight buffers.
- Self-transfer risk is explained but not numerically scored.
- The demo has only one positioning connection with a fare: Bremen → Hamburg.
- No authentication, persistence, booking, payment, or user accounts are included.

## Planned provider integrations

Future provider implementations can target the existing contracts for flight aggregators, European rail inventory, ferry schedules, and geocoding/location search. Integrations must return normalized domain models, label their true source, handle provider errors explicitly, and use real APIs rather than simulated live responses.
