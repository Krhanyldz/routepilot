import { executeLiveLocationSearch, parseLiveLocationSearchRequest } from "@/application/live-location-search";
import { configureLocationSearch, readRouteDataMode, AmadeusLocationProviderError } from "@/providers/production/amadeus";
import { RequestProtectionConfigurationError, RequestProtectionGate } from "@/server/request-protection";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const maximumUrlLength = 2_048;
const requestProtection = new RequestProtectionGate();
const responseHeaders = { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" };

export async function GET(request: Request): Promise<Response> {
  const requestId = crypto.randomUUID();
  if (request.url.length > maximumUrlLength) return json({ status: "failure", reason: "uri-too-long", requestId }, 414);
  let rateLimit;
  try {
    rateLimit = await requestProtection.consume(request);
  } catch (error) {
    const reason = error instanceof RequestProtectionConfigurationError
      ? "request-protection-misconfigured"
      : "request-protection-unavailable";
    return json({ status: "unavailable", reason, requestId }, 503);
  }
  if (!rateLimit.allowed) {
    return json({ status: "failure", reason: "request-rate-limit", requestId }, 429, {
      "Retry-After": String(rateLimit.retryAfterSeconds),
    });
  }

  try {
    const query = parseLiveLocationSearchRequest(new URL(request.url).searchParams);
    const outcome = await executeLiveLocationSearch(query, safeLocationConfiguration());
    if (outcome.status === "success") return json({ ...outcome, requestId }, 200);
    if (outcome.status === "unavailable") return json({ ...outcome, requestId }, 503);
    return json({ ...outcome, requestId }, outcome.reason === "timeout" ? 504 : 502);
  } catch (error) {
    if (error instanceof AmadeusLocationProviderError && error.code === "invalid-request") {
      return json({ status: "failure", reason: "invalid-request", requestId }, 400);
    }
    return json({ status: "failure", reason: "internal-error", requestId }, 500);
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

function json(body: unknown, status: number, headers: Record<string, string> = {}): Response {
  return Response.json(body, { status, headers: { ...responseHeaders, ...headers } });
}
