# RoutePilot AI strategy

## Position

AI is an optional interaction and explanation layer over verified RoutePilot results. It must not calculate prices, create transport offers, invent routes, or decide whether an itinerary is operationally valid. The deterministic system remains usable without AI.

The current MVP uses deterministic business-rule explanations and no generative AI. AI capabilities belong to a later product phase after real provider data, normalization, validation, and observability are mature.

## Required architecture

```text
transport provider data
        ↓
normalized offers
        ↓
deterministic route engine
        ↓
scoring and validation
        ↓
AI explanation and conversational interface
```

Trust flows only downward through this pipeline. The AI receives structured, validated route records and evidence; it cannot write offers into the provider layer, alter computed totals, bypass validation, or promote a rejected candidate. Any conversational change produces a new structured search request that runs through the same deterministic pipeline.

## Permitted AI capabilities

AI may:

- Interpret a natural-language travel request.
- Convert stated preferences into a proposed structured filter set.
- Ask for missing inputs or explain unsupported requests.
- Explain why a valid route was selected using supplied evidence.
- Compare valid routes and their computed cost, time, transfer, and risk attributes.
- Suggest a new search using flexible dates, a wider radius, or nearby departure cities.
- Summarize known self-transfer, booking, visa, and safety trade-offs from attributed data.
- Maintain a conversational interface over deterministic tools.

Any extracted filters must be shown or otherwise available for user review. Suggestions are search hypotheses, not claims that a route or fare exists.

## Prohibited AI capabilities

AI must not:

- Fabricate or interpolate prices, schedules, visa rules, safety data, availability, operators, locations, or booking URLs.
- Create a route that was not returned and validated by the deterministic route system.
- Perform authoritative price arithmetic or currency conversion.
- Override mode, duration, transfer, connection, eligibility, or safety constraints.
- Present demo data as live data or omit its demo label.
- Claim that a booking or connection is protected without explicit provider evidence.
- Convert unknown protection, baggage, accessibility, visa, or safety status into a positive claim.
- guarantee fares, entry permission, safety, successful connections, or provider availability.
- Conceal affiliate influence or modify deterministic ranking without disclosure.

## Tool and data contract

AI should call narrow, schema-validated tools rather than provider APIs directly. Recommended tools include:

- `resolve_locations`: returns canonical location candidates and ambiguity metadata.
- `search_routes`: accepts validated structured search criteria and returns route IDs and status.
- `get_route_details`: returns an immutable route snapshot, normalized legs, totals, source references, freshness, and validation flags.
- `compare_routes`: returns deterministic deltas between valid route IDs.
- `propose_search_change`: validates a changed filter set before a new search.
- `get_travel_guidance`: returns attributed visa or safety records scoped to traveler assumptions.

Inputs and outputs require versioned schemas. Route totals should be passed as display-ready values plus exact machine values; the model must repeat them, not recompute them. Booking URLs should not be exposed to the model unless needed for a cited response and must always be validated outside the model.

## Grounded explanation design

Each explanation should be generated from an evidence bundle containing:

- Route and leg identifiers.
- Deterministically calculated totals and route-to-route deltas.
- Selected ranking objective and constraint outcomes.
- Provider/source, data status, and freshness.
- Self-transfer and protection state.
- Known inclusions, exclusions, and uncertainty.
- Required demo, visa, safety, and booking disclaimers.

The response layer should use structured claims tied to evidence fields. Mandatory labels and warnings are rendered by application code, not entrusted solely to model prose. If evidence is missing, the AI says it is unknown and recommends verification; it does not fill the gap.

## Natural-language request flow

1. Parse the request into a draft structured search.
2. Resolve ambiguous locations and ask only for required missing information.
3. Present or log the interpreted constraints.
4. Invoke deterministic location, provider, route, price, scoring, and validation services.
5. Give the AI only accepted route snapshots and explicit rejection/uncertainty reasons.
6. Generate an explanation or comparison with route IDs and citations to available sources.
7. Render fixed disclosures and validated booking actions outside the generated text.

Requests for bus travel are rejected as unsupported rather than translated into another mode.

## Failure behavior and safeguards

- If route tools fail, return a service or provider error; never answer from model memory.
- If no valid route exists, explain that result and offer changes that trigger a fresh deterministic search.
- If evidence conflicts, prefer no claim and surface the conflict for provider investigation.
- If content filters or the model fail, retain the deterministic results UI and rule-based explanations.
- Treat provider text and user-supplied text as untrusted input and isolate it from system/tool instructions.
- Use allowlisted tools, strict schemas, bounded calls, authentication between services, and complete audit logs.
- Exclude credentials, payment information, and unnecessary personal data from prompts and logs.

## Evaluation and release gates

Before release, maintain test sets for ordinary, ambiguous, multilingual, adversarial, self-transfer, visa-sensitive, demo-data, and no-result searches. Measure:

- Structured intent and filter accuracy.
- Unsupported-mode rejection accuracy.
- Route, price, schedule, and source claim faithfulness.
- Preservation of demo and self-transfer labels.
- Correct refusal to infer unknown visa, safety, protection, and availability facts.
- Tool selection and argument validity.
- Explanation usefulness without changing deterministic facts.
- Latency, fallback rate, and cost.

Release requires zero tolerated fabricated routes or prices in the acceptance suite, complete preservation of mandatory disclosures, and a reliable non-AI fallback. Production sampling should detect mismatches between generated claims and the underlying evidence bundle, with rapid rollback or feature disablement.

## Privacy and retention

Collect only information needed for travel search. Nationality, residency, passport, accessibility, and preference data can be sensitive and require explicit purpose, retention limits, access controls, and deletion behavior before collection. Do not train models on user conversations or itineraries without an explicit, separately governed decision and user consent where required.
