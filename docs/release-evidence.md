# Release candidate evidence

Readiness is a set of verified gates, not a percentage. A gate is complete only when its automated checks pass on the release commit and its target-environment verification is recorded.

| Subsystem | Requirement | Implementation | Automated verification | Manual verification | Residual risk |
|---|---|---|---|---|---|
| Architecture | Provider-independent domain and routing | Domain, routing, application, provider contracts, AI and UI boundaries | Strict typecheck/build and domain tests | Review release diff | Train/ferry inventory remains outside beta |
| Security | Validate input, protect secrets and fail closed | CSP/HSTS, safe errors, HMAC client identifiers, distributed Vercel controls | Header, API, limiter, E2E and dependency-audit tests | Deployed HTTPS/header scan | CSP retains `unsafe-inline` |
| Reliability | Explicit upstream degradation | Timeouts/retries in TravelPayouts location adapter; no demo fallback; unavailable flight capability | Location provider and API failure tests; smoke | Exercise Data API and Redis outage in preview | No approved real-time flight provider access |
| Performance | Bound burst impact | Static pages, distributed rate limiting, bounded preview probe | Production build, limiter and load-guard tests | Record preview p95/error rate | No production traffic baseline |
| Observability | Correlate requests | Structured events, request IDs, W3C traces, server timing, health | Observability and smoke tests | Connect uptime/log alert delivery | External monitoring not configured |
| Deployment | Reproduce and roll back | Locked toolchain, env contract, smoke/load and immutable rollback procedure | CI quality/build/smoke/E2E | Preview deploy and rollback drill | No approved production deployment |
| Core UX | Worldwide airport autocomplete and honest flight state | TravelPayouts Data API, IATA identity, accessible errors | Browser and application tests | Mobile/desktop preview test | Core flight result journey is blocked |

## Public beta gate

The release is not approved until one immutable commit has:

1. Green required GitHub checks.
2. Preview configuration with TravelPayouts Data API and Upstash secrets.
3. Successful `npm run smoke -- https://preview-host`.
4. A real worldwide location lookup without secret exposure.
5. An approved, contract-tested TravelPayouts Flight Search API adapter returning real-time offers.
6. Successful bounded preview load evidence and alert delivery.
7. Promotion of the exact preview artifact, production smoke, and a tested rollback target.

## External evidence still required

- TravelPayouts Aviasales Flight Search API approval and required affiliate metadata.
- Upstash and TravelPayouts secrets configured in the target deployment.
- Monitoring/log retention destination and incident recipient.
- Deployment approval, hostname, preview evidence, and rollback drill.
