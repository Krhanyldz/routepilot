import { executeLiveLocationSearch, parseLiveLocationSearchRequest } from "@/application/live-location-search";
import type { AirportSearchProvider, GeocodingProvider } from "@/providers/location-interfaces";
import { LocationSearchProviderError } from "@/providers/location-interfaces";
import { configureTravelpayoutsLocationSearch } from "@/providers/production/travelpayouts";
import { RequestProtectionConfigurationError, RequestProtectionGate } from "@/server/request-protection";
import { apiOutcome, createTraceContext, observeApiRequest } from "@/server/api-observability";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const maximumUrlLength = 2_048;
const requestProtection = new RequestProtectionGate();
let locationProvider: (AirportSearchProvider & GeocodingProvider) | undefined;
const responseHeaders = { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" };

export async function GET(request: Request): Promise<Response> {
  const requestId = crypto.randomUUID();
  const trace = createTraceContext(request.headers.get("traceparent"));
  const observation = observeApiRequest("location-search", "GET", requestId, { trace });
  const respond = (body: unknown, status: number, headers: Record<string, string> = {}) => {
    const event = observation.complete(status, apiOutcome(body));
    return json(body, status, requestId, trace.traceparent, event.durationMs, headers);
  };
  if (request.url.length > maximumUrlLength) return respond({ status: "failure", reason: "uri-too-long", requestId }, 414);
  let rateLimit;
  try {
    rateLimit = await requestProtection.consume(request);
  } catch (error) {
    const reason = error instanceof RequestProtectionConfigurationError
      ? "request-protection-misconfigured"
      : "request-protection-unavailable";
    return respond({ status: "unavailable", reason, requestId }, 503);
  }
  if (!rateLimit.allowed) {
    return respond({ status: "failure", reason: "request-rate-limit", requestId }, 429, {
      "Retry-After": String(rateLimit.retryAfterSeconds),
    });
  }

  try {
    const query = parseLiveLocationSearchRequest(new URL(request.url).searchParams);
    const configuration = safeLocationConfiguration();
    const outcome = await executeLiveLocationSearch(query, configuration);
    if (outcome.status === "success") return respond({ ...outcome, requestId }, 200);
    if (outcome.status === "unavailable") return respond({ ...outcome, requestId }, 503);
    return respond({ ...outcome, requestId }, outcome.reason === "timeout" ? 504 : 502);
  } catch (error) {
    if (error instanceof LocationSearchProviderError && error.code === "invalid-request") {
      return respond({ status: "failure", reason: "invalid-request", requestId }, 400);
    }
    return respond({ status: "failure", reason: "internal-error", requestId }, 500);
  }
}

function safeLocationConfiguration(): { configured: boolean; provider: (AirportSearchProvider & GeocodingProvider) | null } {
  try {
    return { configured: true, provider: (locationProvider ??= configureTravelpayoutsLocationSearch()) };
  } catch {
    return { configured: true, provider: null };
  }
}

function json(body: unknown, status: number, requestId: string, traceparent: string, durationMs: number, headers: Record<string, string> = {}): Response {
  return Response.json(body, { status, headers: {
    ...responseHeaders,
    "Server-Timing": `app;dur=${durationMs}`,
    "Traceparent": traceparent,
    "X-Request-Id": requestId,
    ...headers,
  } });
}
