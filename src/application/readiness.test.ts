import { describe, expect, it } from "vitest";
import { evaluateReadiness } from "./readiness";

const now = () => new Date("2026-07-22T12:00:00.000Z");

describe("deployment readiness", () => {
  it("reports the explicitly isolated demo as ready", () => {
    expect(evaluateReadiness({ ROUTE_DATA_MODE: "demo" }, now)).toEqual({
      status: "ready",
      mode: "demo",
      checks: { flightInventory: "not-required", requestProtection: "not-required" },
      checkedAt: "2026-07-22T12:00:00.000Z",
    });
  });

  it("reports invalid and incomplete live configuration without exposing secrets", () => {
    expect(evaluateReadiness({ ROUTE_DATA_MODE: "invalid" }, now)).toMatchObject({ status: "not-ready", mode: "invalid" });
    expect(evaluateReadiness({ NODE_ENV: "production", ROUTE_DATA_MODE: "live" }, now)).toMatchObject({
      status: "not-ready",
      checks: { flightInventory: "misconfigured", requestProtection: "misconfigured" },
    });
  });

  it("accepts complete production live configuration", () => {
    expect(evaluateReadiness({
      NODE_ENV: "production",
      ROUTE_DATA_MODE: "live",
      AMADEUS_CLIENT_ID: "client-id",
      AMADEUS_CLIENT_SECRET: "client-secret",
      AMADEUS_ENVIRONMENT: "production",
      RATE_LIMIT_BACKEND: "upstash",
      UPSTASH_REDIS_REST_URL: "https://redis.example",
      UPSTASH_REDIS_REST_TOKEN: "token",
      RATE_LIMIT_KEY_SECRET: "a-secure-secret-that-is-at-least-32-characters",
    }, now)).toMatchObject({
      status: "ready",
      mode: "live",
      checks: { flightInventory: "ready", requestProtection: "ready" },
    });
  });
});
