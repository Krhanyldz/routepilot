# Production operations

## Health and readiness

`GET /api/health` is a configuration-readiness endpoint. It performs no provider request and never returns credentials. It reports:

- `locationData`: ready only when `TRAVELPAYOUTS_API_TOKEN` is configured;
- `requestProtection`: ready when a valid local backend is selected, and only with Upstash on Vercel;
- `flightInventory`: unavailable until TravelPayouts Flight Search API access is approved and integrated.

The endpoint uses `Cache-Control: no-store`. Runtime provider failures are represented by safe endpoint outcomes and structured completion logs.

## Required environment

Local development:

```text
TRAVELPAYOUTS_API_TOKEN=...
RATE_LIMIT_BACKEND=memory
```

Vercel preview and production:

```text
TRAVELPAYOUTS_API_TOKEN=...
RATE_LIMIT_BACKEND=upstash
UPSTASH_REDIS_REST_URL=...
UPSTASH_REDIS_REST_TOKEN=...
RATE_LIMIT_KEY_SECRET=<unique random value of at least 32 characters>
```

Do not configure Amadeus variables. RoutePilot has no Amadeus runtime dependency.

## Structured runtime events

Flight and location endpoints emit one bounded JSON completion event per request. Events include time, severity, route, HTTP status, opaque request ID, outcome, trace identifiers, and duration. They exclude client addresses, search terms, routes, dates, provider payloads, credentials, and exception messages.

Recommended alerts after connecting a free monitoring/log destination:

- `status >= 500` above 5% for five minutes;
- `outcome` in `upstream`, `timeout`, or `provider-misconfigured` above 2% for ten minutes;
- `request-rate-limit` above 10% for five minutes;
- p95 duration above 2,000 ms for ten minutes;
- two consecutive non-200 health probes.

## Deployment gate

1. Use a green, immutable commit.
2. Configure only the variables listed above in the hosting platform.
3. Confirm ingress overwrites `X-Forwarded-For`.
4. Confirm health reports `locationData: ready`, `requestProtection: ready`, and `flightInventory: unavailable`.
5. Verify a real worldwide location lookup succeeds.
6. Verify a valid flight search returns safe `503 provider-capability-unavailable` without demo data.
7. Run `npm run smoke -- https://preview.example`.
8. Run the bounded preview load probe and retain its JSON output.
9. Promote the exact preview artifact, repeat smoke, and retain the previous deployment as rollback target.

This gate permits infrastructure preview verification. Public beta flight search remains blocked until TravelPayouts Flight Search API access is approved and a contract-tested adapter exists.

## Preview load evidence

```bash
ROUTEPILOT_LOAD_ACK=preview-only \
LOAD_REQUESTS=1000 \
LOAD_CONCURRENCY=25 \
LOAD_MAX_P95_MS=2000 \
LOAD_MAX_ERROR_RATE=0.01 \
npm run load:preview -- https://preview.example
```

The probe is capped at 10,000 requests and 100 workers, requires HTTPS remotely, and refuses remote targets without the acknowledgement. It exercises application and readiness capacity without consuming live flight inventory.

## Rollback

If readiness, security headers, validation, location search, or safe flight-unavailable behavior fails, immediately route traffic to the last known-good immutable deployment. Preserve logs and request IDs, reproduce on preview, and do not repair production in place.

No database restoration is currently required because RoutePilot has no persistent user or booking store. When persistence is introduced, backup encryption, restore testing, RPO, RTO, and migration rollback become release blockers.

## Incident ownership

- **TravelPayouts Data API outage:** autocomplete returns an explicit safe error; never substitute hardcoded airports.
- **Redis outage:** Vercel searches fail closed while static pages and diagnostics remain available.
- **Traffic spike:** distributed per-client controls protect the application and upstream location API.
- **Bad release:** roll back to the previous immutable deployment and repeat smoke.
- **Credential exposure:** revoke and rotate the affected TravelPayouts or Redis credential, redeploy, and inspect structured logs.
