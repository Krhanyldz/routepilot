import { executeLiveFlightSearch, parseLiveFlightSearchQuery } from "@/application/live-flight-search";
import { LiveFlightProviderError } from "@/providers/live-flight";
import { configureFlightInventory } from "@/providers/production/amadeus";
import { RequestProtectionConfigurationError, RequestProtectionGate } from "@/server/request-protection";
import { apiOutcome, createTraceContext, observeApiRequest } from "@/server/api-observability";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const maximumBodyBytes = 16_384;
const requestProtection = new RequestProtectionGate();
const responseHeaders = {
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
};

export async function POST(request: Request): Promise<Response> {
  const requestId = crypto.randomUUID();
  const trace = createTraceContext(request.headers.get("traceparent"));
  const observation = observeApiRequest("flight-search", "POST", requestId, { trace });
  const respond = (body: unknown, status: number, headers: Record<string, string> = {}) => {
    const event = observation.complete(status, apiOutcome(body));
    return json(body, status, requestId, trace.traceparent, event.durationMs, headers);
  };
  let rateLimit;
  try {
    rateLimit = await requestProtection.consume(request);
  } catch (error) {
    if (error instanceof RequestProtectionConfigurationError) {
      return respond({ status: "unavailable", reason: "request-protection-misconfigured", requestId }, 503);
    }
    return respond({ status: "unavailable", reason: "request-protection-unavailable", requestId }, 503);
  }
  if (!rateLimit.allowed) {
    return respond({ status: "failure", reason: "request-rate-limit", requestId }, 429, {
      "Retry-After": String(rateLimit.retryAfterSeconds),
    });
  }
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    return respond({ status: "failure", reason: "unsupported-content-type", requestId }, 415);
  }
  const declaredLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > maximumBodyBytes) {
    return respond({ status: "failure", reason: "payload-too-large", requestId }, 413);
  }

  try {
    const body = await request.text();
    if (new TextEncoder().encode(body).byteLength > maximumBodyBytes) {
      return respond({ status: "failure", reason: "payload-too-large", requestId }, 413);
    }
    const query = parseLiveFlightSearchQuery(JSON.parse(body) as unknown);
    const inventory = safeInventoryConfiguration();
    const outcome = await executeLiveFlightSearch(query, inventory);
    if (outcome.status === "success") return respond({ ...outcome, requestId }, 200);
    if (outcome.status === "unavailable") return respond({ ...outcome, requestId }, 503);
    const status = outcome.reason === "timeout" ? 504 : 502;
    return respond({ ...outcome, requestId }, status);
  } catch (error) {
    if (error instanceof SyntaxError || (error instanceof LiveFlightProviderError && error.code === "invalid-request")) {
      return respond({ status: "failure", reason: "invalid-request", requestId }, 400);
    }
    return respond({ status: "failure", reason: "internal-error", requestId }, 500);
  }
}

function safeInventoryConfiguration(): { configured: boolean; provider: ReturnType<typeof configureFlightInventory>["liveProvider"] } {
  try {
    const inventory = configureFlightInventory();
    return { configured: inventory.mode === "live", provider: inventory.liveProvider };
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
