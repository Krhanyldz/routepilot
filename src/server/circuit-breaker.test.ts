import { describe, expect, it, vi } from "vitest";
import { CircuitBreaker, CircuitOpenError } from "./circuit-breaker";

describe("CircuitBreaker", () => {
  it("opens after the configured failures and recovers through one half-open probe", async () => {
    let now = 1_000;
    const breaker = new CircuitBreaker(2, 10_000, () => true, () => now);
    const failure = () => Promise.reject(new Error("offline"));

    await expect(breaker.execute(failure)).rejects.toThrow("offline");
    await expect(breaker.execute(failure)).rejects.toThrow("offline");
    expect(breaker.currentState()).toBe("open");
    await expect(breaker.execute(vi.fn())).rejects.toBeInstanceOf(CircuitOpenError);

    now = 11_000;
    expect(breaker.currentState()).toBe("half-open");
    await expect(breaker.execute(async () => "ready")).resolves.toBe("ready");
    expect(breaker.currentState()).toBe("closed");
  });

  it("does not count excluded failures", async () => {
    const breaker = new CircuitBreaker(1, 10_000, (error) => error === "retryable");
    await expect(breaker.execute(() => Promise.reject("invalid"))).rejects.toBe("invalid");
    expect(breaker.currentState()).toBe("closed");
  });

  it("rejects concurrent probes while half-open", async () => {
    let now = 0;
    const breaker = new CircuitBreaker(1, 10, () => true, () => now);
    await expect(breaker.execute(() => Promise.reject(new Error("offline")))).rejects.toThrow();
    now = 10;
    let release: (() => void) | undefined;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    const probe = breaker.execute(async () => { await gate; return "ok"; });
    await expect(breaker.execute(async () => "duplicate")).rejects.toBeInstanceOf(CircuitOpenError);
    release?.();
    await expect(probe).resolves.toBe("ok");
  });
});
