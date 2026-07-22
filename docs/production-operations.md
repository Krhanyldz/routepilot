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

Events intentionally exclude client addresses, search terms, airport pairs, dates, provider payloads, credentials, and exception messages. Platform log drains may derive request counts, error ratios, latency distributions, rate-limit counts, and provider-unavailability alerts from `api.request.completed`. External error tracking still requires a separately approved service and credentials.

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
