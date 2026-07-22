export interface RateLimitDecision {
  allowed: boolean;
  retryAfterSeconds: number;
}

export interface RequestRateLimiter {
  consume(key: string): Promise<RateLimitDecision>;
}

interface Bucket {
  count: number;
  resetAtMs: number;
}

export class FixedWindowRateLimiter implements RequestRateLimiter {
  private readonly buckets = new Map<string, Bucket>();

  constructor(
    private readonly maximumRequests: number,
    private readonly windowMs: number,
    private readonly now: () => number = Date.now,
  ) {
    if (!Number.isSafeInteger(maximumRequests) || maximumRequests < 1) throw new Error("maximumRequests must be positive");
    if (!Number.isSafeInteger(windowMs) || windowMs < 1) throw new Error("windowMs must be positive");
  }

  async consume(key: string): Promise<RateLimitDecision> {
    const now = this.now();
    const current = this.buckets.get(key);
    const bucket = !current || current.resetAtMs <= now
      ? { count: 0, resetAtMs: now + this.windowMs }
      : current;
    bucket.count += 1;
    this.buckets.set(key, bucket);
    this.prune(now);
    return {
      allowed: bucket.count <= this.maximumRequests,
      retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAtMs - now) / 1_000)),
    };
  }

  private prune(now: number): void {
    if (this.buckets.size < 1_000) return;
    for (const [key, bucket] of this.buckets) {
      if (bucket.resetAtMs <= now) this.buckets.delete(key);
    }
  }
}
