export type CircuitState = "closed" | "open" | "half-open";

export class CircuitOpenError extends Error {
  constructor(readonly retryAfterMs: number) {
    super("Circuit is open");
    this.name = "CircuitOpenError";
  }
}

export class CircuitBreaker {
  private failures = 0;
  private openedAt = 0;
  private state: CircuitState = "closed";
  private probeInFlight = false;

  constructor(
    private readonly failureThreshold: number,
    private readonly resetTimeoutMs: number,
    private readonly shouldCount: (error: unknown) => boolean,
    private readonly now: () => number = Date.now,
  ) {
    if (!Number.isSafeInteger(failureThreshold) || failureThreshold < 1) throw new Error("failureThreshold must be positive");
    if (!Number.isSafeInteger(resetTimeoutMs) || resetTimeoutMs < 1) throw new Error("resetTimeoutMs must be positive");
  }

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    this.prepareExecution();
    try {
      const result = await operation();
      this.close();
      return result;
    } catch (error) {
      if (this.shouldCount(error)) this.recordFailure();
      throw error;
    } finally {
      if (this.state === "half-open") this.probeInFlight = false;
    }
  }

  currentState(): CircuitState {
    if (this.state === "open" && this.remainingOpenMs() === 0) return "half-open";
    return this.state;
  }

  private prepareExecution(): void {
    if (this.state === "closed") return;
    const remaining = this.remainingOpenMs();
    if (this.state === "open" && remaining > 0) throw new CircuitOpenError(remaining);
    this.state = "half-open";
    if (this.probeInFlight) throw new CircuitOpenError(this.resetTimeoutMs);
    this.probeInFlight = true;
  }

  private recordFailure(): void {
    if (this.state === "half-open") {
      this.open();
      return;
    }
    this.failures += 1;
    if (this.failures >= this.failureThreshold) this.open();
  }

  private open(): void {
    this.state = "open";
    this.openedAt = this.now();
    this.probeInFlight = false;
  }

  private close(): void {
    this.state = "closed";
    this.failures = 0;
    this.probeInFlight = false;
  }

  private remainingOpenMs(): number {
    return Math.max(0, this.openedAt + this.resetTimeoutMs - this.now());
  }
}
