# Security review

This document records the current unauthenticated, read-only MVP threat review. It is not a substitute for recurring review when authentication, persistence, affiliate redirects, AI tools, or payments are introduced.

## Browser boundary

All application and API responses apply HSTS, MIME sniffing prevention, frame denial, restrictive referrer and permissions policies, same-origin opener/resource policies, and a Content Security Policy. CSP permits only same-origin network connections and resources, blocks plugins and frames, fixes the base URI and form target to this origin, and upgrades insecure subresources.

Next.js currently emits inline bootstrap scripts and styles for statically generated pages. The policy therefore retains `unsafe-inline` for scripts and styles. A request nonce would remove that allowance, but the supported Next.js nonce path forces every page to dynamic rendering and disables CDN/static caching. That is an unacceptable availability and cost regression for the current public, read-only pages. Inline execution remains a tracked residual XSS risk; user-authored HTML and raw HTML rendering are prohibited. Re-evaluate nonce-based CSP before rendering stored user content or authenticated sensitive data.

HSTS intentionally omits `includeSubDomains` and preload. Those settings require control and operational review of every subdomain and are not safe to infer before production domain ownership is confirmed.

## OWASP boundary review

- **Input and injection:** public request shapes, field allowlists, lengths, dates, IATA/country codes, JSON content type, body size, and URL size are validated before provider calls. Provider responses are normalized fail-closed. No raw SQL, shell, or HTML execution path exists.
- **XSS:** React output encoding, no `dangerouslySetInnerHTML`, bounded provider fields, and CSP reduce exposure. The documented inline-script allowance is the main residual risk.
- **CSRF:** current endpoints are idempotent searches and do not authenticate, mutate server state, set cookies, or perform purchases. CSRF tokens become mandatory when state-changing authenticated actions are added.
- **SSRF and redirects:** provider base URLs are selected from fixed server configuration; users cannot provide hosts or booking URLs. RoutePilot currently emits no external redirect. Future booking URLs require HTTPS host allowlists and redirect tests.
- **Secrets:** credentials are server-only, environment validated, absent from logs/responses, and excluded from the repository. Live production mode fails closed when credentials or distributed abuse protection are missing.
- **Abuse:** request size limits and per-client distributed rate limiting protect live provider endpoints. Production ingress must overwrite forwarded client-address headers.
- **Availability:** timeouts, bounded retries, in-flight request coalescing, and a circuit breaker limit provider incidents. Health/readiness and structured safe logs expose configuration and runtime outcomes.
- **Dependencies and CI:** locked installs, production audits, deterministic tests, builds, and browser E2E are required branch checks. Major dependency upgrades remain isolated for review.

## Next security gates

1. Confirm the production domain before adding HSTS subdomain coverage or preload.
2. Add authenticated-action CSRF and authorization tests before accounts or saved routes.
3. Add an allowlisted booking-link builder before any external redirect.
4. Connect an approved error-tracking/log-drain service with secret scrubbing.
5. Run a production DAST and header scan after deployment approval.
