import { describe, expect, it, vi } from "vitest";
import { DistributedRateLimiter } from "./upstash-rate-limit";

describe("distributed rate limiter", () => {
  it("normalizes provider decisions and retry timing", async () => {
    const limit = vi.fn().mockResolvedValue({ success: false, reset: 11_500 });
    const limiter = new DistributedRateLimiter({ limit }, () => 10_000);

    await expect(limiter.consume("anonymous-key")).resolves.toEqual({
      allowed: false,
      retryAfterSeconds: 2,
    });
    expect(limit).toHaveBeenCalledWith("anonymous-key");
  });

  it("does not hide distributed store failures", async () => {
    const limiter = new DistributedRateLimiter({ limit: vi.fn().mockRejectedValue(new Error("offline")) });
    await expect(limiter.consume("key")).rejects.toThrow("offline");
  });
});
