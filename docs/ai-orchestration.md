# AI Travel Strategist orchestration

## Purpose

The AI Travel Strategist is a deterministic orchestration layer above RoutePilot's routing engine. It makes structured search and validated route evidence easier to use conversationally. It does not calculate or validate journeys.

The routing engine remains the single source of truth for routes, prices, durations, transfers, ranking, and risk. Provider adapters remain the source of normalized transport offers. The strategist cannot access provider payloads or booking inventory directly.

## Architecture

```text
User
  ↓
Deterministic natural-language parser
  ↓
Validated TravelRequest
  ↓
StrategistRouteEngine port
  ↓
Route engine + deterministic pricing, validation, risk, and ranking
  ↓
Sanitized RankedRoutesEvidence
  ↓
Deterministic explanation templates + alternative descriptions
  ↓
Optional grounded explanation prompt
  ↓
Final UI with fixed labels and warnings
```

The strategist depends on a narrow route-engine interface. Production composition will adapt the existing routing application service to that interface. This foundation does not replace or duplicate the route engine and is not yet connected to the current demo UI.

## TravelRequest

`TravelRequest` is the structured contract between conversation and routing. It contains:

- Origin and destination.
- Departure and return flexibility in days.
- Optional budget.
- Preferred and avoided transport modes.
- Maximum transfers and total duration.
- Nearby-departure toggle and supported search radius.
- Deutschlandticket ownership.
- Self-transfer permission.
- Preferred balance: `cheapest`, `fastest`, or `smartest`.

Only flight, train, and ferry are valid modes. The validator rejects missing locations, invalid numeric limits, unsupported modes, and a mode that is both preferred and avoided. Parsed locations are still text at this boundary; canonical location resolution belongs to the deterministic application/routing flow.

## Natural-language parser

The parser uses explicit patterns and known vocabulary. It extracts only supported preferences and merges them with the current conversation request. It does not call a language model, resolve a location, infer provider availability, or create route legs.

Unrecognized text does not become route data. A future probabilistic intent parser may propose the same structured fields, but its output must pass validation and be reviewable before invoking routing.

## Route-engine boundary and evidence

`StrategistRouteEngine.search` accepts a validated `TravelRequest` and returns `RankedRoutesEvidence`. The routing side must compute and assign:

- Accepted route IDs and leg topology.
- Display-ready total prices and durations.
- Transfer totals.
- Risk labels.
- Cheapest, fastest, lowest-risk, fewest-transfer, and best-value categories.
- Approved comparison facts such as a savings amount or a cheaper mode.
- Demo or live data status.

The strategist treats this object as immutable evidence. It never subtracts prices, sums durations, counts route legs, evaluates self-transfers, or changes category assignments. If a category has no validated route, the alternative generator says so.

Provider IDs, raw offers, schedules, availability payloads, provider policies, and booking URLs are deliberately absent from this contract. This reduces data leakage and prevents explanation code from treating raw provider claims as validated route facts.

## Prompt builder

The prompt builder accepts only `RankedRoutesEvidence`. It serializes a limited payload containing route IDs, engine-assigned categories, display-ready facts, supported-mode leg summaries, approved explanation facts, and data status.

Its system instructions require any future explanation model to:

- Repeat prices and durations exactly as supplied.
- Avoid calculations and inference.
- Avoid invented routes, schedules, availability, visa rules, risk, or provider policies.
- Preserve demo labels.
- Avoid claims of connection protection without approved evidence.

The prompt is an optional future integration point. The current implementation sends it nowhere and makes no external API call.

## Route explanation engine

The route explanation engine is a deterministic template renderer. Supported evidence includes:

- Positioning savings, including whether Deutschlandticket makes the positioning fare free.
- A selected train/flight/ferry leg being cheaper than an engine-confirmed alternative mode.
- A slower route having an engine-computed savings amount.
- An approved self-transfer warning.

For example, the routing layer can supply `€241` as a display-ready savings fact. The renderer may produce “Hamburg departure saves €241 because Deutschlandticket makes positioning free.” It does not derive €241 from route totals.

## Alternative generator

The alternative generator covers:

- Cheapest.
- Fastest.
- Lowest risk.
- Fewest transfers.
- Best value.

It finds the route already tagged with each category and describes its supplied price, duration, transfer count, and risk label. It does not sort candidates or calculate scores. Ties and category policy must be resolved before evidence reaches the strategist.

## Conversation state

`TravelConversationState` stores a conversation ID, the current structured request, and immutable turns. Each accepted turn records the user message and interpreted request. A later message such as “fastest, maximum one transfer” therefore keeps the previous origin, destination, and Deutschlandticket preference unless explicitly changed.

This is an in-memory domain model, not an account or persistence feature. Future storage must add consent, retention, deletion, access control, and schema migration before retaining user conversations. Sensitive travel information should be minimized.

## Orchestration flow

`AiTravelStrategist.handleMessage` performs only these steps:

1. Merge deterministic parser output with the current request.
2. Validate the complete request.
3. Invoke the injected route engine once.
4. Render approved evidence through deterministic templates.
5. Describe engine-assigned alternatives.
6. Build the optional sanitized prompt.
7. Append the accepted request to conversation state.

If parsing or validation fails, routing is not called. If routing fails or returns no evidence, the strategist must expose that state; it must not recover from memory or invent a result.

## Non-negotiable safeguards

- No route, price, duration, transfer, risk, or ranking calculation in `src/ai`.
- No direct provider dependency or raw provider data in prompts.
- No external AI or transport API calls in this foundation.
- No invented schedules, availability, visa requirements, safety facts, or provider policies.
- No removal or weakening of demo-data and self-transfer disclosures.
- No bus mode or silent coercion to a supported mode.
- The final UI remains responsible for fixed factual fields and mandatory warnings; generated prose is supplementary.

## Testing strategy

Tests verify natural-language extraction, preference reuse, single delegation to an injected route engine, exact rendering of approved evidence, engine-owned category selection, and absence of provider/availability fields from prompts. Existing routing tests remain authoritative for route calculation behavior.
