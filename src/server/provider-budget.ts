import { FixedWindowRateLimiter, type RateLimitDecision, type RequestRateLimiter } from "./rate-limit";
import { createUpstashRateLimiter, type DistributedRateLimitPolicy } from "./upstash-rate-limit";

type Environment = Record<string, string | undefined>;

export class ProviderBudgetConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProviderBudgetConfigurationError";
  }
}

export interface ProviderBudget {
  consume(scope: string): Promise<RateLimitDecision>;
}

interface ProviderBudgetFactories {
  memory(maximumRequests: number, windowMs: number): RequestRateLimiter;
  upstash(url: string, token: string, policy: DistributedRateLimitPolicy): RequestRateLimiter;
}

const defaultFactories: ProviderBudgetFactories = {
  memory: (maximumRequests, windowMs) => new FixedWindowRateLimiter(maximumRequests, windowMs),
  upstash: createUpstashRateLimiter,
};

export class ProviderBudgetGate {
  private budget: ProviderBudget | undefined;

  constructor(private readonly factory: () => ProviderBudget = createProviderBudget) {}

  consume(scope: string): Promise<RateLimitDecision> {
    return (this.budget ??= this.factory()).consume(scope);
  }
}

export function createProviderBudget(
  environment: Environment = process.env,
  factories: ProviderBudgetFactories = defaultFactories,
): ProviderBudget {
  const amadeusEnvironment = environment.AMADEUS_ENVIRONMENT ?? "test";
  if (amadeusEnvironment !== "test" && amadeusEnvironment !== "production") {
    throw new ProviderBudgetConfigurationError("AMADEUS_ENVIRONMENT must be test or production");
  }
  const policies = providerPolicies(
    amadeusEnvironment,
    environment.PROVIDER_MAX_REQUESTS_PER_SECOND,
    environment.PROVIDER_MAX_REQUESTS_PER_DAY,
  );
  const productionLive = environment.NODE_ENV === "production" && environment.ROUTE_DATA_MODE === "live";
  const backend = environment.RATE_LIMIT_BACKEND ?? "memory";
  if (backend !== "memory" && backend !== "upstash") {
    throw new ProviderBudgetConfigurationError("RATE_LIMIT_BACKEND must be memory or upstash");
  }
  if (productionLive && backend !== "upstash") {
    throw new ProviderBudgetConfigurationError("Production live mode requires a distributed provider budget");
  }

  const limiters = policies.map((policy) => backend === "upstash"
    ? factories.upstash(
      required(environment.UPSTASH_REDIS_REST_URL, "UPSTASH_REDIS_REST_URL"),
      required(environment.UPSTASH_REDIS_REST_TOKEN, "UPSTASH_REDIS_REST_TOKEN"),
      policy,
    )
    : factories.memory(policy.maximumRequests, windowMilliseconds(policy.window)));
  return {
    async consume(scope) {
      let decision: RateLimitDecision = { allowed: true, retryAfterSeconds: 1 };
      for (const limiter of limiters) {
        decision = await limiter.consume(scope);
        if (!decision.allowed) return decision;
      }
      return decision;
    },
  };
}

function providerPolicies(
  environment: "test" | "production",
  configuredRequestsPerSecond: string | undefined,
  configuredRequestsPerDay: string | undefined,
): DistributedRateLimitPolicy[] {
  if (environment === "test") {
    return [{ maximumRequests: 1, window: "100 ms", prefix: "routepilot:amadeus-throughput" }];
  }
  if (!configuredRequestsPerSecond?.trim()) {
    throw new ProviderBudgetConfigurationError("Production Amadeus requires PROVIDER_MAX_REQUESTS_PER_SECOND");
  }
  const maximumRequests = Number(configuredRequestsPerSecond);
  if (!Number.isSafeInteger(maximumRequests) || maximumRequests < 1 || maximumRequests > 40) {
    throw new ProviderBudgetConfigurationError("PROVIDER_MAX_REQUESTS_PER_SECOND must be an integer from 1 to 40");
  }
  if (!configuredRequestsPerDay?.trim()) {
    throw new ProviderBudgetConfigurationError("Production Amadeus requires PROVIDER_MAX_REQUESTS_PER_DAY");
  }
  const maximumRequestsPerDay = Number(configuredRequestsPerDay);
  if (!Number.isSafeInteger(maximumRequestsPerDay) || maximumRequestsPerDay < 1) {
    throw new ProviderBudgetConfigurationError("PROVIDER_MAX_REQUESTS_PER_DAY must be a positive integer");
  }
  return [
    { maximumRequests, window: "1 s", prefix: "routepilot:amadeus-throughput" },
    { maximumRequests: maximumRequestsPerDay, window: "86400 s", prefix: "routepilot:amadeus-daily-budget" },
  ];
}

function windowMilliseconds(window: DistributedRateLimitPolicy["window"]): number {
  const [amount, unit] = window.split(" ");
  return Number(amount) * (unit === "s" ? 1_000 : 1);
}

function required(value: string | undefined, name: string): string {
  if (!value?.trim()) throw new ProviderBudgetConfigurationError(`${name} is required`);
  return value;
}
