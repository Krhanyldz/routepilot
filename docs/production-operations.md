# Production operations

## Health and readiness

`GET /api/health` is the deployment readiness endpoint. It performs no paid provider request and never returns credentials or raw configuration values.

- Demo mode returns `200 ready`; external inventory and distributed request protection are explicitly not required.
- Live mode returns `200 ready` only when Amadeus and request-protection configuration can be constructed.
- Invalid or incomplete configuration returns `503 not-ready` with component-level `misconfigured` states.

Deployment health checks should poll this endpoint and remove instances returning `503` from service. The endpoint is dynamic and carries `Cache-Control: no-store`.

This is a configuration readiness check, not a dependency reachability probe. Provider and Redis runtime failures remain visible through structured live-search completion events.

## Structured runtime events

Flight and location search endpoints emit one JSON completion event per request. Events contain a timestamp, severity, bounded route name, HTTP method and status, opaque request ID, bounded outcome code, and duration. The same request ID is returned in `X-Request-Id` and the response body for support correlation.

Endpoints accept a valid W3C `traceparent`, preserve its trace ID and sampling flag, create a fresh server span ID, and return the new context. Invalid/all-zero contexts are discarded and replaced. Completion logs contain only trace/span IDs, while `Server-Timing: app;dur=...` exposes server duration for browser diagnostics. No baggage or arbitrary trace attributes are accepted.

Events intentionally exclude client addresses, search terms, airport pairs, dates, provider payloads, credentials, and exception messages. Platform log drains may derive request counts, error ratios, latency distributions, rate-limit counts, and provider-unavailability alerts from `api.request.completed`. External error tracking still requires a separately approved service and credentials.

Recommended initial alerts after connecting a log/metrics backend:

- availability: `status >= 500` above 5% for five minutes;
- provider degradation: `outcome` in `upstream`, `timeout`, or `provider-misconfigured` above 2% for ten minutes;
- abuse or exhausted quota: `request-rate-limit` above 10% for five minutes;
- latency: p95 `durationMs` above 2,000 ms for ten minutes;
- readiness: two consecutive non-200 `/api/health` probes.

Tune thresholds only from observed traffic and record every change. Avoid user-controlled fields in metric labels to prevent cardinality and privacy failures.

Repeated retryable Amadeus failures open an instance-local circuit for 30 seconds. During that window searches fail fast with the existing safe upstream failure contract. A single half-open probe restores service after recovery; operators should alert on sustained `upstream` outcomes across instances.

## Browser security baseline

Every route receives the following response headers:

- `Content-Security-Policy` limiting resources and connections to the application origin, blocking frames/plugins, and fixing base/form targets
- `Cross-Origin-Opener-Policy: same-origin`
- `Cross-Origin-Resource-Policy: same-origin`
- `Permissions-Policy` denying camera, microphone, geolocation, and payment access
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Strict-Transport-Security: max-age=31536000`
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`

The framework disclosure header is disabled. The CSP retains `unsafe-inline` for Next.js bootstrap scripts and styles so public pages remain statically generated and CDN-cacheable. The residual risk and nonce trade-off are recorded in the [security review](security-review.md). HSTS subdomain coverage and preload are deferred until domain ownership and every subdomain are reviewed.

## Deployment gate

Before switching `ROUTE_DATA_MODE` to `live`:

1. Configure Amadeus credentials server-side.
2. Configure the Upstash REST URL, token, and a unique 32+ character rate-limit key secret.
3. Confirm the ingress overwrites `X-Forwarded-For`.
4. Confirm `/api/health` returns `200 ready`.
5. Exercise a live search and verify provider failures do not expose upstream messages.
6. Run `EXPECTED_ROUTE_DATA_MODE=live npm run smoke -- https://deployment.example` against the deployment URL.

The smoke command refuses non-HTTPS remote targets. It verifies home availability, CSP/HSTS/frame protections, readiness mode, non-cacheable health responses, safe invalid-input behavior, and request-ID correlation without consuming a paid provider search.

## Release and rollback

1. Deploy an immutable build from a green `main` commit to a preview environment.
2. Configure secrets through the hosting platform; never copy them into build arguments or repository files.
3. Run the live-mode smoke contract against preview.
4. Promote that exact build to production and repeat the smoke contract.
5. If readiness, headers, validation, or user search fails, immediately route traffic back to the last known-good immutable deployment. Do not attempt an in-place production repair.
6. Preserve the failing deployment logs and request IDs, open an incident record, and reproduce on preview before retrying promotion.

Database restoration is currently not applicable because RoutePilot has no persistent user or booking store. Provider data is fetched live and demo knowledge-graph data is versioned in Git. When persistence is introduced, backup encryption, restore testing, RPO, RTO, and migration rollback become release blockers.

## Disaster recovery ownership

- **Provider outage:** circuit breaker fails fast; keep the site available with explicit provider-unavailable responses. Never substitute demo fares in live mode.
- **Rate-limit store outage:** live production searches fail closed while static pages and health diagnostics remain available.
- **Bad application release:** roll back to the previous immutable deployment and verify it with the same smoke command.
- **Credential exposure:** revoke and rotate the affected provider/Redis credential, redeploy, review structured logs for abuse, and invalidate any derived secrets.
- **Hosting-region outage:** use the hosting platform's regional recovery capabilities; selecting and approving the production platform and regions is a deployment decision.
