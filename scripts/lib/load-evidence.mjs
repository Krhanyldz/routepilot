export function parseLoadConfiguration(environment, argument) {
  const baseUrl = normalizeBaseUrl(argument ?? environment.ROUTEPILOT_BASE_URL);
  const requests = integer(environment.LOAD_REQUESTS ?? "200", "LOAD_REQUESTS", 1, 10_000);
  const concurrency = integer(environment.LOAD_CONCURRENCY ?? "10", "LOAD_CONCURRENCY", 1, 100);
  const maximumP95Ms = integer(environment.LOAD_MAX_P95_MS ?? "2000", "LOAD_MAX_P95_MS", 1, 60_000);
  const maximumErrorRate = decimal(environment.LOAD_MAX_ERROR_RATE ?? "0.01", "LOAD_MAX_ERROR_RATE", 0, 1);
  const loopback = new URL(baseUrl).hostname === "127.0.0.1" || new URL(baseUrl).hostname === "localhost";
  if (!loopback && environment.ROUTEPILOT_LOAD_ACK !== "preview-only") {
    throw new Error("Set ROUTEPILOT_LOAD_ACK=preview-only after confirming the target is a non-production preview");
  }
  return { baseUrl, requests, concurrency: Math.min(concurrency, requests), maximumP95Ms, maximumErrorRate };
}

export function summarizeLoadResults(durations, failures, configuration) {
  if (durations.length === 0) throw new Error("Load run produced no measurements");
  const sorted = [...durations].sort((left, right) => left - right);
  const errorRate = failures / durations.length;
  const summary = {
    requests: durations.length,
    failures,
    errorRate,
    p50Ms: percentile(sorted, 0.5),
    p95Ms: percentile(sorted, 0.95),
    p99Ms: percentile(sorted, 0.99),
  };
  return {
    ...summary,
    passed: summary.errorRate <= configuration.maximumErrorRate && summary.p95Ms <= configuration.maximumP95Ms,
  };
}

function normalizeBaseUrl(value) {
  if (!value) throw new Error("Provide ROUTEPILOT_BASE_URL or a target URL as the first argument");
  const url = new URL(value);
  const loopback = url.hostname === "127.0.0.1" || url.hostname === "localhost";
  if (url.protocol !== "https:" && !(loopback && url.protocol === "http:")) {
    throw new Error("Load targets must use HTTPS; HTTP is allowed only for loopback testing");
  }
  url.pathname = "/";
  url.search = "";
  url.hash = "";
  return url.toString().replace(/\/$/, "");
}

function integer(value, name, minimum, maximum) {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < minimum || parsed > maximum) {
    throw new Error(`${name} must be an integer from ${minimum} to ${maximum}`);
  }
  return parsed;
}

function decimal(value, name, minimum, maximum) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < minimum || parsed > maximum) {
    throw new Error(`${name} must be a number from ${minimum} to ${maximum}`);
  }
  return parsed;
}

function percentile(sorted, quantile) {
  return sorted[Math.max(0, Math.ceil(sorted.length * quantile) - 1)];
}
