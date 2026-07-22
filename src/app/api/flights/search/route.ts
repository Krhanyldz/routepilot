import { executeLiveFlightSearch, parseLiveFlightSearchQuery } from "@/application/live-flight-search";
import { LiveFlightProviderError } from "@/providers/live-flight";
import { configureFlightInventory } from "@/providers/production/amadeus";
import { FixedWindowRateLimiter } from "@/server/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const maximumBodyBytes = 16_384;
const rateLimiter = new FixedWindowRateLimiter(20, 60_000);
const responseHeaders = {
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
};

export async function POST(request: Request): Promise<Response> {
  const requestId = crypto.randomUUID();
  const clientKey = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const rateLimit = rateLimiter.consume(clientKey);
  if (!rateLimit.allowed) {
    return json({ status: "failure", reason: "request-rate-limit", requestId }, 429, {
      "Retry-After": String(rateLimit.retryAfterSeconds),
    });
  }
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    return json({ status: "failure", reason: "unsupported-content-type", requestId }, 415);
  }
  const declaredLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > maximumBodyBytes) {
    return json({ status: "failure", reason: "payload-too-large", requestId }, 413);
  }

  try {
    const body = await request.text();
    if (new TextEncoder().encode(body).byteLength > maximumBodyBytes) {
      return json({ status: "failure", reason: "payload-too-large", requestId }, 413);
    }
    const query = parseLiveFlightSearchQuery(JSON.parse(body) as unknown);
    const inventory = safeInventoryConfiguration();
    const outcome = await executeLiveFlightSearch(query, inventory);
    if (outcome.status === "success") return json({ ...outcome, requestId }, 200);
    if (outcome.status === "unavailable") return json({ ...outcome, requestId }, 503);
    const status = outcome.reason === "timeout" ? 504 : 502;
    return json({ ...outcome, requestId }, status);
  } catch (error) {
    if (error instanceof SyntaxError || (error instanceof LiveFlightProviderError && error.code === "invalid-request")) {
      return json({ status: "failure", reason: "invalid-request", requestId }, 400);
    }
    return json({ status: "failure", reason: "internal-error", requestId }, 500);
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

function json(body: unknown, status: number, headers: Record<string, string> = {}): Response {
  return Response.json(body, { status, headers: { ...responseHeaders, ...headers } });
}
