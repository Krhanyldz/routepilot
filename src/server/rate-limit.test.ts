import { describe, expect, it } from "vitest";
import { FixedWindowRateLimiter } from "./rate-limit";

describe("fixed-window rate limiter", () => {
  it("limits each key independently and resets deterministically", async () => {
    let now = 1_000;
    const limiter = new FixedWindowRateLimiter(2, 10_000, () => now);

    expect((await limiter.consume("a")).allowed).toBe(true);
    expect((await limiter.consume("a")).allowed).toBe(true);
    expect(await limiter.consume("a")).toEqual({ allowed: false, retryAfterSeconds: 10 });
    expect((await limiter.consume("b")).allowed).toBe(true);
    now = 11_000;
    expect(await limiter.consume("a")).toEqual({ allowed: true, retryAfterSeconds: 10 });
  });

  it("rejects invalid configuration", () => {
    expect(() => new FixedWindowRateLimiter(0, 1_000)).toThrow("maximumRequests");
    expect(() => new FixedWindowRateLimiter(1, 0)).toThrow("windowMs");
  });
});
