import { executeLiveLocationSearch, parseLiveLocationSearchRequest } from "@/application/live-location-search";
import { configureLocationSearch, readRouteDataMode, AmadeusLocationProviderError } from "@/providers/production/amadeus";
import { RequestProtectionConfigurationError, RequestProtectionGate } from "@/server/request-protection";
import { apiOutcome, createTraceContext, observeApiRequest } from "@/server/api-observability";
import { ProviderBudgetGate } from "@/server/provider-budget";
import { guardProviderRequest } from "@/server/provider-budget-guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const maximumUrlLength = 2_048;
const requestProtection = new RequestProtectionGate();
const providerBudget = new ProviderBudgetGate();
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
    if (configuration.provider) {
      const budget = await guardProviderRequest(providerBudget, "location-search");
      if (budget.status === "rejected") {
        return respond({ status: "failure", reason: budget.reason, requestId }, budget.httpStatus, {
          "Retry-After": String(budget.retryAfterSeconds),
        });
      }
      if (budget.status === "unavailable") {
        return respond({ status: "unavailable", reason: budget.reason, requestId }, budget.httpStatus);
      }
    }
    const outcome = await executeLiveLocationSearch(query, configuration);
    if (outcome.status === "success") return respond({ ...outcome, requestId }, 200);
    if (outcome.status === "unavailable") return respond({ ...outcome, requestId }, 503);
    return respond({ ...outcome, requestId }, outcome.reason === "timeout" ? 504 : 502);
  } catch (error) {
    if (error instanceof AmadeusLocationProviderError && error.code === "invalid-request") {
      return respond({ status: "failure", reason: "invalid-request", requestId }, 400);
    }
    return respond({ status: "failure", reason: "internal-error", requestId }, 500);
  }
}

function safeLocationConfiguration(): { configured: boolean; provider: ReturnType<typeof configureLocationSearch> | null } {
  try {
    if (readRouteDataMode() === "demo") return { configured: false, provider: null };
    return { configured: true, provider: configureLocationSearch() };
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
