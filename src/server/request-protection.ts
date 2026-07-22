import { createHmac } from "node:crypto";
import { FixedWindowRateLimiter, type RequestRateLimiter } from "./rate-limit";
import { createUpstashRateLimiter } from "./upstash-rate-limit";

type RateLimitBackend = "memory" | "upstash";
type Environment = Record<string, string | undefined>;

export class RequestProtectionConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RequestProtectionConfigurationError";
  }
}

export interface RequestProtection {
  limiter: RequestRateLimiter;
  identify(request: Request): string;
}

interface RequestProtectionFactories {
  memory(): RequestRateLimiter;
  upstash(url: string, token: string): RequestRateLimiter;
}

const defaultFactories: RequestProtectionFactories = {
  memory: () => new FixedWindowRateLimiter(20, 60_000),
  upstash: createUpstashRateLimiter,
};

export function createRequestProtection(
  environment: Environment = process.env,
  factories: RequestProtectionFactories = defaultFactories,
): RequestProtection {
  const backend = parseBackend(environment.RATE_LIMIT_BACKEND);
  const isProductionLive = environment.NODE_ENV === "production" && environment.ROUTE_DATA_MODE === "live";
  if (isProductionLive && backend !== "upstash") {
    throw new RequestProtectionConfigurationError("Production live mode requires a distributed rate-limit backend");
  }

  if (backend === "memory") {
    return { limiter: factories.memory(), identify: clientAddress };
  }

  const url = required(environment.UPSTASH_REDIS_REST_URL, "UPSTASH_REDIS_REST_URL");
  const token = required(environment.UPSTASH_REDIS_REST_TOKEN, "UPSTASH_REDIS_REST_TOKEN");
  const keySecret = required(environment.RATE_LIMIT_KEY_SECRET, "RATE_LIMIT_KEY_SECRET");
  if (keySecret.length < 32) throw new RequestProtectionConfigurationError("RATE_LIMIT_KEY_SECRET must contain at least 32 characters");

  return {
    limiter: factories.upstash(url, token),
    identify: (request) => createHmac("sha256", keySecret).update(clientAddress(request)).digest("hex"),
  };
}

function parseBackend(value: string | undefined): RateLimitBackend {
  const backend = value ?? "memory";
  if (backend !== "memory" && backend !== "upstash") {
    throw new RequestProtectionConfigurationError("RATE_LIMIT_BACKEND must be memory or upstash");
  }
  return backend;
}

function required(value: string | undefined, name: string): string {
  if (!value?.trim()) throw new RequestProtectionConfigurationError(`${name} is required`);
  return value;
}

function clientAddress(request: Request): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}
