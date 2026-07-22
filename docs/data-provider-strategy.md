# RoutePilot data provider strategy

## Goals and boundaries

Provider integrations supply evidence; they do not own product routing or presentation. Each integration maps external records into normalized domain contracts. The route engine depends on those contracts, never a concrete provider. Demo fixtures stay inside explicit demo providers.

Supported transport modes are flight, train, and ferry. Bus transport must not be added to provider contracts, normalization, routing, or fallback behavior. No real API should be simulated: until credentials and an actual integration exist, RoutePilot uses visibly labeled demo data.

## Provider interfaces

The following are target contracts, not commitments to a specific vendor. Live implementations should be asynchronous and return both data and operational metadata. Schemas must be versioned as the current synchronous MVP contracts evolve.

### Common result envelope

Every provider call should return or throw a typed outcome containing:

- Provider and adapter version.
- Request/correlation ID.
- Records plus per-record source identifiers.
- Retrieved time, provider effective time when supplied, and cache status.
- Coverage or pagination metadata.
- Warnings and typed partial-data indicators.

Errors must distinguish invalid input, authentication, authorization/terms, quota, rate limit, timeout, temporary upstream failure, malformed response, and unsupported coverage. An empty successful result is not the same as provider failure.

### Flight provider

Input includes canonical origin/destination airport IDs, dates, traveler/fare parameters, cabin, and allowed connection constraints. Output is a set of bookable itinerary offers containing segments, marketing and operating carriers, flight numbers, local and UTC times, airports/terminals when supplied, fare and currency, taxes/fees, baggage/fare conditions, availability/freshness, protection or ticketing boundary evidence, and a provider booking reference or validated URL.

The adapter must preserve whole-itinerary offers where breaking them into independent edges would lose price or protection semantics.

### Train provider

Input includes canonical station IDs, dates/times, travelers, discount entitlements, and service preferences supported by the provider. Output contains train/service identifiers, operator, stations, platforms when supplied, local and UTC-aware times, changes, fare/currency, reservation requirements, fare conditions, and booking data.

Deutschlandticket eligibility must be explicit, evidence-based, scoped to the service/product and effective date, and separate from provider price. Unknown eligibility is normalized as unknown, never eligible.

### Ferry provider

Input includes canonical port IDs, travel date, passengers, and supported vehicle/accommodation details if those become in scope. Output contains sailing/operator identifiers, ports/terminals, check-in cutoff, departure/arrival times, passenger fare and currency, mandatory fees, accommodation or vehicle scope, fare conditions, and booking data.

Missing check-in or port-transfer information must remain unknown. Ferry schedule records alone must not be represented as priced availability.

### Location provider

The location contract resolves text and provider-specific codes to canonical cities, airports, stations, and ports; retrieves a location by ID; and discovers typed locations around coordinates. Records include canonical name, aliases, type, country/region, coordinates, time zone, operational status, codes, parent city/complex, provider mappings, and source/freshness.

Location identity is owned by RoutePilot's canonical mapping layer. Provider IDs are aliases, not cross-provider join keys. Nearby airport and station discovery must be distinguishable from actual positioning connectivity.

### Currency provider

Input is base currency, quote currencies, and an effective time or acceptable freshness. Output contains decimal rate, base/quote, source, publication/effective time, retrieval time, and precision metadata.

Conversion occurs once in deterministic pricing using exact decimal/minor-unit rules and a recorded rate. Historical results retain the rate snapshot used. AI and UI code do not calculate conversions.

### Visa information provider

Input may include nationality, residence, document type, origin, transit and destination jurisdictions, route timing, and transit/airside assumptions. Output is structured guidance with rule category, applicable traveler assumptions, jurisdiction, source URL, source authority, effective/updated time, required verification actions, and uncertainty.

This provider supplies informational context, not a definitive eligibility decision. If required traveler or transit facts are absent, the result must say that determination is unavailable. Prefer official government sources and link users to them.

### Safety information provider

Input includes countries/regions and travel dates. Output contains advisory level as defined by the source, affected area, category, summary, issuing authority, source URL, publication/update time, and expiry or supersession when available.

RoutePilot must not merge different authorities' scales as if directly equivalent. Absence of a record is unknown, not safe. Safety information does not participate in route generation unless a separately approved deterministic policy converts an authoritative restriction into a constraint.

## Normalization rules

1. Preserve raw provider payloads only where terms, privacy rules, encryption, access controls, and retention policy allow; normalized fields retain source traceability.
2. Use stable RoutePilot IDs. Store provider IDs as namespaced mappings.
3. Accept only `flight`, `train`, and `ferry` transport modes. Reject unknown modes at the adapter boundary; never coerce bus data into train or another mode.
4. Represent locations canonically with explicit type, coordinates, country code, time zone, operational state, and parent relationships where known.
5. Store instants with offsets/UTC plus the source local date/time and IANA time zone. Handle daylight-saving transitions explicitly.
6. Store money as currency plus exact minor units or an exact decimal appropriate to that currency. Never use binary floating-point for live monetary calculations.
7. Separate base fare, taxes, mandatory fees, discounts, optional extras, and unknown costs. Do not infer missing amounts.
8. Preserve offer-level pricing and ticket/protection boundaries; do not sum segment display prices when the provider priced an itinerary as a unit.
9. Normalize duration from timestamps where reliable, while retaining provider duration and flagging conflicts.
10. Use explicit `true`, `false`, or `unknown` states for self-transfer/protection, availability, Deutschlandticket eligibility, accessibility, and other evidence-sensitive attributes.
11. Deduplicate only offers that are demonstrably equivalent in itinerary, fare product, traveler scope, currency, and booking boundary. Preserve competing sources and attribution.
12. Validate required fields, nonnegative values, chronological consistency, location compatibility, and booking domains. Quarantine malformed records rather than repairing them with guesses.
13. Every record carries `demo` or `live` data status. Demo and live records are never silently combined into one route.

## Cache strategy

Use server-side caches only. Cache keys include provider, adapter/schema version, normalized query, traveler/fare parameters, locale/currency, and any entitlement that changes results. Do not include secrets in keys or logs.

Recommended layers are short-lived in-process request coalescing, a shared result cache, and a longer-lived canonical location cache. TTLs are provider- and data-class-specific:

- Live availability and fares: shortest TTL, governed by provider terms and volatility.
- Timetables: moderate TTL, with invalidation for known schedule changes.
- Locations: long TTL, refreshed periodically and invalidated for closures or code changes.
- Currency: aligned to source publication frequency and product tolerance.
- Visa and safety: based on source update cadence, with urgent invalidation/polling capability.

Serve-stale behavior must be explicit. Stale-while-revalidate may be acceptable for discovery or advisory context, but stale prices must be labeled with their observation time and rechecked before redirect when possible. Never extend storage beyond provider terms.

## Timeouts and cancellation

Set separate connection and total deadlines per provider, plus an overall search deadline. Propagate cancellation when the user abandons or supersedes a search. Latency budgets should allow useful providers to finish without one slow integration blocking all results.

Timeouts produce a typed provider failure and health metric, not an empty offer set. Visa and safety context may load independently from transport results, while mandatory route validation data must be available before a candidate is accepted.

## Retry behavior

Retry only transient, idempotent reads: connection resets, selected 5xx responses, and rate limits when a compliant `Retry-After` fits the request deadline. Use exponential backoff with jitter and a small attempt cap. Do not retry validation, authentication, permission, or malformed-payload errors automatically.

Apply retries within the overall deadline and respect provider terms. Use circuit breakers to stop amplifying a failing upstream. RoutePilot does not perform booking writes, so booking-side retry and idempotency are outside current scope.

## Rate limits

Maintain a configured quota policy per provider and credential, including burst and sustained limits. Coordinate limits across application instances, reserve capacity where needed for user-initiated searches, deduplicate identical in-flight requests, and prefer compliant caches.

Honor provider headers and `Retry-After`. On exhaustion, return a typed degraded state and do not bypass limits, rotate credentials improperly, or substitute invented data. Track quota use, rejection count, latency, cache hit rate, and projected cost with alerts.

## Partial-provider failure

Provider aggregation must isolate failures. If one provider or mode fails, RoutePilot may return routes supported entirely by successful providers when they remain valid and useful. The response and UI must show reduced coverage, affected modes/providers, freshness, and a retry option.

Do not return a route whose required leg or validation evidence came from a failed provider. Do not translate failure into “no routes available.” If missing coverage could materially change the cheapest recommendation, qualify ranking language (for example, “cheapest among returned providers”). Complete failure produces an explicit unavailable state.

## Data freshness

Store provider effective time, retrieval time, cache age, and expiry independently. Show users an understandable “checked at” value for volatile prices and availability. Revalidate a selected offer before redirect when the provider supports it, while making clear that only the provider confirms the final price.

Define freshness service-level objectives per data class and provider. Monitor stale-record rate, late updates, clock skew, schedule conflicts, and offer disappearance. Visa and safety records require source update timestamps and urgent refresh paths; an old advisory must never appear current merely because it was retrieved recently.

## Booking URL validation

- Prefer opaque provider booking references resolved server-side over accepting arbitrary URLs.
- Permit HTTPS only and use an allowlist of official or contractually authorized hosts per provider.
- Parse and validate URLs structurally; reject credentials, unexpected ports, unsafe schemes, unapproved redirect hosts, and malformed encoding.
- Prevent open redirects and validate the final destination where provider redirect flows allow it.
- Bind the link to its provider, itinerary/leg scope, locale, and expiry when known.
- Revalidate links at ingestion and before display/redirect; monitor broken-link rates.
- Fall back to a validated provider search page or disable booking with an explanation.
- Never construct unsupported deep links, expose secret tokens, or claim the displayed price is held.

Separate-ticket routes receive separate links in journey order with clear coverage and self-transfer warnings.

## Provider terms, privacy, and attribution

Before integration, document permitted caching, retention, display, modification, ranking, deep-linking, affiliate use, logo use, geographic coverage, request volume, and derived-data rights. Legal/commercial approval and credentials are release dependencies.

Render required provider names, logos, timestamps, fare disclaimers, and affiliate disclosures without obscuring them. Track attribution at offer and field level where multiple sources contribute. Provide mechanisms to delete prohibited cached/raw data and disable a provider promptly. Never scrape or circumvent access controls when terms do not permit it.

Minimize personal data sent to providers and disclose necessary sharing. Keep credentials in managed server-side secrets and never commit them or expose them to browser code, logs, or AI prompts.

## Demo fallback behavior

Demo providers remain deterministic, local, and visibly labeled. They are useful for development, automated tests, product tours, and an explicitly selected demo environment.

Live-provider failure must not silently activate demo results. If a demo fallback is offered, it must:

- Appear in a separate state headed “Demo data.”
- Explain which live source failed and that displayed prices/schedules are fictional examples.
- Disable live booking actions.
- Avoid mixing demo legs with live legs or ranking demo results against live results.
- Preserve deterministic fixtures and source metadata.

Production configuration should default to honest partial/unavailable states rather than demo fallback. A demo experience is never evidence of current availability.

## Provider onboarding checklist

Before enabling a provider:

- Contract and terms approved; credentials stored securely.
- Coverage, quotas, cost, and ownership documented.
- Adapter maps to versioned normalized contracts with provenance.
- Fixture, contract, malformed-data, timeout, retry, and rate-limit tests pass.
- Cache and retention comply with terms.
- Health dashboards, alerts, circuit breaker, and disable switch exist.
- Booking hosts and redirects are validated.
- Attribution and freshness display is verified accessibly on mobile and desktop.
- Partial failure and demo separation are tested.
- No unsupported transport mode can enter the domain.
