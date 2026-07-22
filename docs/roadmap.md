# RoutePilot roadmap

## Roadmap principles

Phases are capability gates, not promised dates. A phase begins only when its dependencies and operational ownership are in place. Throughout every phase, RoutePilot supports flights, trains, and ferries only; bus transport remains out of scope. The deterministic route and pricing layers remain authoritative, demo data remains labeled, and RoutePilot redirects rather than sells tickets.

## Phase 1 — Stable demo MVP

### Objective

Prove that complete-cost, nearby-departure, multimodal routing is understandable and technically sound without implying live coverage.

### Deliverables

- Stable deterministic demo providers and normalized domain models.
- Constrained graph route engine for flight, train, and ferry offers.
- Nearby airport and station discovery.
- Deutschlandticket-aware deterministic pricing.
- Transparent route comparison, risk messaging, demo labeling, and polished responsive UI.
- Automated tests and contributor/product foundation documentation.

### Dependencies

- Agreed supported modes and architecture boundaries.
- Curated, internally consistent demo fixtures.
- Defined routing and pricing policies.

### Acceptance criteria

- Bremen–Antalya and Bremen–Baotou scenarios are deterministic and tested.
- Nearby search, duration, transfer, allowed-mode, budget, and Deutschlandticket controls behave as documented.
- Every result and discovery price is visibly demo data.
- No live API, booking, authentication, or unsupported mode is implied.
- Lint, typecheck, tests, and production build pass.

### Main risks

- Users mistake polished demo results for live inventory.
- Small fixture coverage hides normalization and connection edge cases.
- Straight-line nearby discovery overstates practical reachability.

## Phase 2 — Real locations and flights

### Objective

Establish reliable live-search foundations with authoritative location resolution and the first real transport inventory.

### Deliverables

- Real location provider integration for cities, airports, and stations, with canonical IDs and aliases.
- One production flight-provider integration behind the provider contract.
- Currency conversion source where needed.
- Server-side caching, quotas, timeouts, retries, circuit breaking, and provider-health monitoring.
- Source, freshness, fare-condition, and live/demo status in normalized results.
- Validated official booking redirects and provider attribution.

### Dependencies

- Provider selection, credentials, legal/terms review, and budget.
- Secrets management and backend execution environment.
- Async provider contracts and observability design.
- Updated location and monetary schemas.

### Acceptance criteria

- Supported live searches resolve locations deterministically and return traceable flight offers.
- Cache freshness and degraded states are visible; provider failure does not become false “no routes.”
- Rate-limit, timeout, invalid payload, stale cache, currency, and URL-validation tests pass.
- Demo results cannot be confused or silently mixed with live results.
- No credentials reach the repository or client bundle.

### Main risks

- Incomplete fare content, rapidly changing availability, or provider lock-in.
- Location identity mismatches and time-zone errors.
- Rate limits, latency, API cost, and restrictive booking-link terms.

## Phase 3 — Train, ferry, and normalized multimodal results

### Objective

Expand live coverage across all supported modes and safely combine them into comparable journeys.

### Deliverables

- Production train integration and eligibility metadata relevant to Deutschlandticket handling.
- Production ferry integration with sailing-specific rules.
- Versioned cross-provider normalization for locations, time zones, money, operators, fares, and booking boundaries.
- Temporal connection validation, minimum buffers, terminal/station changes, and explicit self-transfer state.
- Partial-provider result handling and mode-specific coverage reporting.
- Comparable multimodal ranking and leg-level booking redirects.

### Dependencies

- Phase 2 provider platform, canonical location graph, currency handling, and monitoring.
- Train and ferry commercial/API access and terms review.
- Connection-risk, fare, and Deutschlandticket policy definitions.

### Acceptance criteria

- Valid live journeys can combine flight, train, and ferry legs without unsupported modes.
- Impossible temporal connections and insufficient buffers are rejected deterministically.
- Totals include every known required leg and clearly itemize unknown or optional costs.
- Separate bookings and unknown/protected/self-transfer states are displayed correctly.
- Failure of one provider yields labeled partial results when remaining results are useful.

### Main risks

- Sparse or inconsistent rail and ferry inventory.
- Schedule changes, overnight/time-zone mistakes, and ambiguous stations or terminals.
- Incorrect fare eligibility or false assumptions about through-ticket protection.

## Phase 4 — Accounts and trip monitoring

### Objective

Let users retain useful searches and receive controlled updates without weakening privacy or result integrity.

### Deliverables

- Accounts and secure authentication.
- Saved routes and reproducible saved search criteria.
- Price alerts based on fresh comparable offers.
- User preferences for modes, nearby radius, duration, transfers, self-transfer tolerance, and Deutschlandticket ownership.
- Notification preferences, consent, export, and deletion controls.

### Dependencies

- Stable live provider coverage and canonical offer comparison.
- Privacy/security review, data model, authentication service, and notification infrastructure.
- Defined alert freshness and price-comparability rules.

### Acceptance criteria

- Users can save, view, update, and delete their data.
- Alerts cite the searched criteria, observed timestamp, source, and material price change.
- Expired offers are never presented as guaranteed bookable prices.
- Sensitive preferences have documented retention and access controls.
- Notification throttling, unsubscribe, account recovery, and abuse protections are tested.

### Main risks

- Account compromise, privacy obligations, and notification fatigue.
- False alerts caused by incomparable fare products or stale inventory.
- Provider costs from repeated monitoring.

## Phase 5 — AI travel strategist

### Objective

Add a grounded conversational layer that makes deterministic RoutePilot capabilities easier to use and understand.

### Deliverables

- Natural-language search mapped to visible structured filters.
- Deterministic, schema-validated tool calling for location resolution and route search.
- Grounded explanations and comparisons based only on validated route snapshots.
- Suggestions for flexible dates and nearby departure cities that initiate new searches.
- Fixed non-AI rendering of prices, demo labels, booking boundaries, and mandatory warnings.
- Evaluation, audit, fallback, privacy, and model-monitoring systems.

### Dependencies

- Mature Phase 3 routing/data contracts and Phase 4 preference consent where personalization is used.
- Versioned tool schemas and evidence bundles.
- AI safety/evaluation suite and a reliable deterministic fallback.

### Acceptance criteria

- AI cannot create an offer, alter a total, bypass a constraint, or expose an unvalidated booking URL.
- Acceptance tests tolerate no fabricated routes or prices.
- Natural-language intent is reviewable and reruns the deterministic pipeline after every change.
- Demo, uncertainty, self-transfer, visa, and safety disclosures are preserved.
- The product remains functional when the AI service is unavailable.

### Main risks

- Hallucinated facts, prompt injection, tool misuse, and misplaced user trust.
- Added latency, model cost, privacy exposure, or degraded accessibility.
- Generated explanations drifting from current provider evidence.

## Phase 6 — Discover opportunities

### Objective

Help users start from flexibility—time, budget, or reachable departure points—and discover worthwhile destinations.

### Deliverables

- Flexible-date and date-window exploration.
- Budget-based destination discovery with complete positioning costs.
- Opportunity feeds generated from fresh, validated inventory.
- Explainable deal baselines and confidence/freshness indicators.
- Disclosed affiliate redirects to validated official or authorized booking pages.

### Dependencies

- Broad provider coverage, efficient cached search, historical/comparable price data, and scalable ranking.
- Affiliate agreements, attribution requirements, and legal review.
- Abuse prevention and clear sponsored-content policy.

### Acceptance criteria

- Every opportunity is reproducible from a deterministic search and shows source and freshness.
- Budget matches include the same required cost categories as ordinary route search.
- Stale or unavailable opportunities are withdrawn or clearly marked.
- Affiliate status is disclosed and organic ranking is independent unless sponsorship is explicit.
- Redirects are validated and RoutePilot never claims to sell or hold the fare.

### Main risks

- Search-space cost, stale deal inventory, misleading savings baselines, and destination bias.
- Affiliate incentives eroding ranking trust.
- Provider restrictions on storage, display, or deep linking.
