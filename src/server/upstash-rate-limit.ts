import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import type { RateLimitDecision, RequestRateLimiter } from "./rate-limit";

interface DistributedLimitClient {
  limit(identifier: string): Promise<{ success: boolean; reset: number }>;
}

export interface DistributedRateLimitPolicy {
  maximumRequests: number;
  window: `${number} ms` | `${number} s`;
  prefix: string;
}

export class DistributedRateLimiter implements RequestRateLimiter {
  constructor(
    private readonly client: DistributedLimitClient,
    private readonly now: () => number = Date.now,
  ) {}

  async consume(key: string): Promise<RateLimitDecision> {
    const result = await this.client.limit(key);
    return {
      allowed: result.success,
      retryAfterSeconds: Math.max(1, Math.ceil((result.reset - this.now()) / 1_000)),
    };
  }
}

export function createUpstashRateLimiter(
  url: string,
  token: string,
  policy: DistributedRateLimitPolicy = {
    maximumRequests: 20,
    window: "60 s",
    prefix: "routepilot:client-search",
  },
): RequestRateLimiter {
  const redis = new Redis({ url, token });
  const client = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(policy.maximumRequests, policy.window),
    prefix: policy.prefix,
    analytics: false,
    timeout: 0,
  });
  return new DistributedRateLimiter(client);
}
