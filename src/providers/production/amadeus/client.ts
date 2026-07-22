import type { AmadeusConfig } from "./config";
import { CircuitBreaker, CircuitOpenError } from "@/server/circuit-breaker";

type Fetch = typeof fetch;

interface CachedToken {
  value: string;
  expiresAtMs: number;
}

export type AmadeusApiErrorCode = "authentication" | "rate-limit" | "timeout" | "upstream" | "invalid-response" | "invalid-request";

export class AmadeusApiError extends Error {
  constructor(
    readonly code: AmadeusApiErrorCode,
    message: string,
    readonly retryable: boolean,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = "AmadeusApiError";
  }
}

export interface AmadeusAuthorizedClient {
  get(path: string, params: URLSearchParams): Promise<unknown>;
}

export class AmadeusApiClient implements AmadeusAuthorizedClient {
  private token: CachedToken | undefined;
  private tokenRefresh: Promise<string> | undefined;
  private readonly inFlightGets = new Map<string, Promise<unknown>>();
  private readonly circuitBreaker: CircuitBreaker;

  constructor(
    private readonly config: AmadeusConfig,
    private readonly fetchImpl: Fetch = fetch,
    private readonly now: () => number = Date.now,
  ) {
    this.circuitBreaker = new CircuitBreaker(
      3,
      30_000,
      (error) => error instanceof AmadeusApiError && error.retryable,
      now,
    );
  }

  async get(path: string, params: URLSearchParams): Promise<unknown> {
    const key = `${path}?${params}`;
    const activeRequest = this.inFlightGets.get(key);
    if (activeRequest) return activeRequest;

    const request = this.protectedGet(path, params);
    this.inFlightGets.set(key, request);
    try {
      return await request;
    } finally {
      if (this.inFlightGets.get(key) === request) this.inFlightGets.delete(key);
    }
  }

  private async protectedGet(path: string, params: URLSearchParams): Promise<unknown> {
    try {
      return await this.circuitBreaker.execute(() => this.performGet(path, params));
    } catch (error) {
      if (error instanceof CircuitOpenError) {
        throw new AmadeusApiError("upstream", "Amadeus is temporarily unavailable", true, { cause: error });
      }
      throw error;
    }
  }

  private async performGet(path: string, params: URLSearchParams): Promise<unknown> {
    let response = await this.authorizedGet(path, params);
    for (let attempt = 0; attempt < this.config.maxRetries && isTransient(response.status); attempt += 1) {
      response = await this.authorizedGet(path, params);
    }
    const payload = await readJson(response);
    if (!response.ok) throw responseError(response.status, payload);
    return payload;
  }

  private async authorizedGet(path: string, params: URLSearchParams): Promise<Response> {
    const token = await this.getAccessToken();
    return this.withTimeout(`${this.config.baseUrl}${path}?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  private async getAccessToken(): Promise<string> {
    if (this.token && this.token.expiresAtMs - 60_000 > this.now()) return this.token.value;
    if (this.tokenRefresh) return this.tokenRefresh;

    const refresh = this.requestAccessToken();
    this.tokenRefresh = refresh;
    try {
      return await refresh;
    } finally {
      if (this.tokenRefresh === refresh) this.tokenRefresh = undefined;
    }
  }

  private async requestAccessToken(): Promise<string> {
    const body = new URLSearchParams({
      grant_type: "client_credentials",
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
    });
    const response = await this.withTimeout(`${this.config.baseUrl}/v1/security/oauth2/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    const payload = await readJson(response);
    if (!response.ok) throw responseError(response.status, payload);
    if (!isRecord(payload) || typeof payload.access_token !== "string" || typeof payload.expires_in !== "number") {
      throw new AmadeusApiError("invalid-response", "Amadeus token response is malformed", false);
    }
    this.token = { value: payload.access_token, expiresAtMs: this.now() + payload.expires_in * 1_000 };
    return this.token.value;
  }

  private async withTimeout(input: string, init: RequestInit): Promise<Response> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.timeoutMs);
    try {
      return await this.fetchImpl(input, { ...init, signal: controller.signal, cache: "no-store" });
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throw new AmadeusApiError("timeout", "Amadeus request timed out", true, { cause: error });
      }
      throw new AmadeusApiError("upstream", "Amadeus request failed", true, { cause: error });
    } finally {
      clearTimeout(timeout);
    }
  }
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch (error) {
    throw new AmadeusApiError("invalid-response", "Amadeus returned non-JSON data", false, { cause: error });
  }
}

function responseError(status: number, payload: unknown): AmadeusApiError {
  const message = extractErrorMessage(payload) ?? `Amadeus returned HTTP ${status}`;
  if (status === 400) return new AmadeusApiError("invalid-request", message, false);
  if (status === 401 || status === 403) return new AmadeusApiError("authentication", message, false);
  if (status === 429) return new AmadeusApiError("rate-limit", message, true);
  return new AmadeusApiError("upstream", message, status >= 500);
}

function extractErrorMessage(payload: unknown): string | undefined {
  if (!isRecord(payload)) return undefined;
  if (typeof payload.error_description === "string") return payload.error_description;
  if (Array.isArray(payload.errors) && isRecord(payload.errors[0]) && typeof payload.errors[0].detail === "string") return payload.errors[0].detail;
  return undefined;
}

function isTransient(status: number): boolean {
  return status === 429 || status >= 500;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
