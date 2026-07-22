# Release candidate evidence

Readiness is a set of verified release gates, not a percentage. A gate is complete only when its automated evidence passes on the exact commit and its listed manual verification is complete in the target environment.

| Subsystem | Requirement | Implementation | Automated verification | Remaining manual verification | Residual risk |
|---|---|---|---|---|---|
| Architecture | Provider-independent domain and deterministic routing | Domain, routing, provider, application, AI, and UI boundaries; canonical locations and versioned graph | Strict build; routing, provider, graph, pricing, and AI tests | Review release diff and real provider contracts | Live train/ferry adapters are outside beta inventory |
| Security | Fail closed and protect secrets/browser/API boundaries | Validation, CSP/HSTS, safe errors, secret validation, HMAC identifiers, distributed abuse controls | Header contract, API error tests, E2E assertions, dependency audit | DAST/header scan on deployed HTTPS host; verify trusted ingress | CSP retains `unsafe-inline`; no authenticated state exists |
| Reliability | Bound upstream failure and prevent stampedes | Timeouts, bounded retry, coalescing, circuit breaker, global provider budget, readiness | Provider error/retry/coalescing/circuit/budget tests; smoke | Exercise Amadeus and Redis failure paths in preview | One live flight provider; no approved stale-cache fallback |
| Performance/capacity | Protect app, provider availability, and approved spend during bursts | Static pages, distributed client limiting, provider-wide TPS pacing and daily cost ceiling; bounded preview load probe | Static production build; limiter/budget composition, load calculation/guardrail, and browser exhaustion-path tests | Run preview probe and verify p95, Redis, Amadeus telemetry, and daily reset behavior | No production baseline; upstream searches remain uncached |
| Observability | Correlate requests and define actionable signals | Structured logs, request IDs, W3C traces, server timing, readiness, alert thresholds | Observability/trace tests and smoke correlation | Connect retention, dashboards, uptime and paging | No external alert delivery until configured |
| Deployment | Reproduce, validate, promote and roll back immutable releases | Locked toolchain, readiness, smoke and rollback runbook | Required CI quality, build+smoke and E2E | Configure secrets, deploy preview, live smoke, promote and rollback drill | No approved target deployment has been exercised |
| Core UX | Search airports and display verified offers safely | Accessible autocomplete, form, loading/error/empty states, provenance/coverage labels | Browser E2E success and throttle paths | Test mobile/desktop browsers with live inventory | No booking redirect; provider coverage excludes carriers |
| Accessibility | Operate search semantically and by keyboard | Labels, combobox/listbox, keyboard selection, live regions | Playwright keyboard journey | Axe, VoiceOver/NVDA and visible-focus review | No WCAG conformance claim |
| SEO | Supply indexable public metadata | Title, description and favicon | Production build | Production hostname needed for canonical, robots, sitemap and social cards | Organic discovery/link previews incomplete |
| Documentation | Make release and recovery reproducible | Architecture, provider, security, CI, operations, rollback and evidence docs | Safety-critical contracts covered in tests | Release owner walks runbook | Some roadmap prose can lag shipped capabilities |
| CI/CD | Prevent unverified changes | Protected linear `main`; required quality, audit, build+smoke and E2E | GitHub required checks on PR/main | Verify operational admin policy | GitHub outage blocks releases by design |
| Operations | Detect, triage and recover safely | Health, traces, fail-closed live mode, rollback and incident guidance | Smoke and degraded-state tests | Assign operator, connect alerts, perform rollback exercise | Future persistence adds backup/RPO/RTO requirements |

## Public beta release gate

The release is not approved until all evidence exists for one immutable commit:

1. Required GitHub checks are green.
2. Preview has production-like secrets and `/api/health` reports `live` and `ready`.
3. `EXPECTED_ROUTE_DATA_MODE=live npm run smoke -- https://preview-host` passes.
4. A real location lookup and flight search pass without exposing secrets or upstream errors.
5. Load testing stays below the provider budget and agreed latency/error thresholds.
6. Uptime and error/provider-budget alerts reach the assigned operator.
7. The exact preview artifact is promoted, production smoke passes, and the prior deployment remains rollback-ready.

## External evidence still required

- Amadeus credentials plus approved per-second and daily production request/billing budgets.
- Upstash credentials.
- Deployment approval and target hostname.
- Monitoring/log retention service and incident recipient.
- Domain decision before canonical SEO metadata or HSTS subdomain/preload changes.
