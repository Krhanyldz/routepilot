import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import type { RateLimitDecision, RequestRateLimiter } from "./rate-limit";

interface DistributedLimitClient {
  limit(identifier: string): Promise<{ success: boolean; reset: number }>;
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

export function createUpstashRateLimiter(url: string, token: string): RequestRateLimiter {
  const redis = new Redis({ url, token });
  const client = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(20, "60 s"),
    prefix: "routepilot:provider-search",
    analytics: false,
    timeout: 0,
  });
  return new DistributedRateLimiter(client);
}
