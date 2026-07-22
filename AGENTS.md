# RoutePilot contributor guide

## Purpose

RoutePilot explores lower-cost multimodal journeys by comparing a user's local departure with nearby airports and stations. The current product is a deterministic MVP backed only by labeled demo data.

## Supported transport modes

- Flight
- Train
- Ferry

Do not introduce additional transport modes without an explicit product requirement and matching domain, provider, routing, UI, and test changes.

## Architecture boundaries

- `src/domain` owns normalized transport and location models and must not depend on providers or UI.
- `src/providers` owns provider contracts, provider aggregation, and implementations. Demo fixtures belong only inside demo providers.
- `src/pricing` owns traveler-specific pricing rules.
- `src/routing` owns geography and graph search. It depends on normalized models and provider interfaces, never concrete demo providers or UI.
- `src/explanations` owns deterministic business-rule explanations. Do not generate route explanations with AI.
- `src/application` composes providers, routing, pricing, and explanations for a use case.
- `src/components` and `src/app` render application results. Routing logic must stay outside UI components.

Demo data must always be visibly labeled as demo data in records and user-facing results. Real APIs must never be faked: use an explicit demo provider until an actual integration and its credentials are available. Never commit API keys or other credentials.

## Required completion checks

Run and pass every command before completing a change:

```bash
npm run lint
npm run typecheck
npm test
npm run build
```
