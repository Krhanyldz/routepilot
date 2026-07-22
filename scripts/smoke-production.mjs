#!/usr/bin/env node

const baseUrl = normalizeBaseUrl(process.argv[2] ?? process.env.ROUTEPILOT_BASE_URL);
await waitUntilReachable(baseUrl);
await verifyHome(baseUrl);
await verifyReadiness(baseUrl);
await verifySafeValidation(baseUrl);
await verifyUnavailableFlightCapability(baseUrl);
console.log(JSON.stringify({ event: "smoke.completed", baseUrl, status: "passed" }));

function normalizeBaseUrl(value) {
  if (!value) throw new Error("Provide an HTTPS ROUTEPILOT_BASE_URL or a loopback URL as the first argument");
  const url = new URL(value);
  const loopback = url.hostname === "127.0.0.1" || url.hostname === "localhost" || url.hostname === "::1";
  if (url.protocol !== "https:" && !(loopback && url.protocol === "http:")) {
    throw new Error("Production smoke targets must use HTTPS; HTTP is allowed only for loopback testing");
  }
  url.pathname = "/";
  url.search = "";
  url.hash = "";
  return url.toString().replace(/\/$/, "");
}

async function waitUntilReachable(origin) {
  let lastError;
  for (let attempt = 0; attempt < 30; attempt += 1) {
    try {
      const response = await fetch(`${origin}/`, { redirect: "error", signal: AbortSignal.timeout(2_000) });
      if (response.ok) return;
      lastError = new Error(`Home returned HTTP ${response.status}`);
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error("RoutePilot did not become reachable within 15 seconds", { cause: lastError });
}

async function verifyHome(origin) {
  const response = await fetch(`${origin}/`, { redirect: "error", signal: AbortSignal.timeout(5_000) });
  assert(response.status === 200, `Home returned HTTP ${response.status}`);
  assert(response.headers.get("content-security-policy")?.includes("object-src 'none'"), "Home is missing the required CSP");
  assert(response.headers.get("strict-transport-security") === "max-age=31536000", "Home is missing the required HSTS policy");
  assert(response.headers.get("x-frame-options") === "DENY", "Home is missing frame denial");
}

async function verifyReadiness(origin) {
  const response = await fetch(`${origin}/api/health`, { redirect: "error", signal: AbortSignal.timeout(5_000) });
  const body = await safeJson(response);
  assert(response.status === 200, `Readiness returned HTTP ${response.status}`);
  assert(body?.status === "ready", "Readiness did not report ready");
  assert(body?.checks?.flightInventory === "unavailable", "Readiness hid the unavailable flight-search capability");
  assert(response.headers.get("cache-control") === "no-store", "Readiness response may be cached");
}

async function verifySafeValidation(origin) {
  const response = await fetch(`${origin}/api/flights/search`, {
    method: "POST",
    redirect: "error",
    headers: { "Content-Type": "application/json", "X-Forwarded-For": crypto.randomUUID() },
    body: JSON.stringify({ originIataCode: "Hamburg" }),
    signal: AbortSignal.timeout(5_000),
  });
  const body = await safeJson(response);
  assert(response.status === 400, `Invalid search returned HTTP ${response.status}`);
  assert(body?.reason === "invalid-request", "Invalid search did not fail closed");
  assert(typeof body?.requestId === "string" && body.requestId.length > 0, "Invalid search omitted request correlation");
  assert(response.headers.get("x-request-id") === body.requestId, "Request correlation headers do not match");
  assert(/^00-[0-9a-f]{32}-[0-9a-f]{16}-00$/.test(response.headers.get("traceparent") ?? ""), "Trace context is missing or malformed");
  assert(/^app;dur=\d+(\.\d+)?$/.test(response.headers.get("server-timing") ?? ""), "Server timing is missing or malformed");
  assert(!JSON.stringify(body).includes("TravelPayouts"), "Invalid search exposed provider details");
}

async function verifyUnavailableFlightCapability(origin) {
  const response = await fetch(`${origin}/api/flights/search`, {
    method: "POST",
    redirect: "error",
    headers: { "Content-Type": "application/json", "X-Forwarded-For": crypto.randomUUID() },
    body: JSON.stringify({ originIataCode: "LON", destinationIataCode: "TYO", departureDate: "2026-09-10", adults: 1 }),
    signal: AbortSignal.timeout(5_000),
  });
  const body = await safeJson(response);
  assert(response.status === 503, `Unavailable flight search returned HTTP ${response.status}`);
  assert(body?.reason === "provider-capability-unavailable", "Unavailable flight search did not disclose the missing capability");
}

async function safeJson(response) {
  try {
    return await response.json();
  } catch {
    throw new Error(`Expected JSON from ${response.url}`);
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
