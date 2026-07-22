import { describe, expect, it } from "vitest";
import { evaluateReadiness } from "./readiness";

const now = () => new Date("2026-07-22T12:00:00.000Z");

describe("deployment readiness", () => {
  it("requires worldwide location data and reports the unavailable flight capability", () => {
    expect(evaluateReadiness({ TRAVELPAYOUTS_API_TOKEN: "token" }, now)).toEqual({
      status: "ready",
      checks: { flightInventory: "unavailable", requestProtection: "ready", locationData: "ready" },
      checkedAt: "2026-07-22T12:00:00.000Z",
    });
    expect(evaluateReadiness({}, now)).toMatchObject({
      status: "not-ready",
      checks: { locationData: "misconfigured" },
    });
  });

  it("requires distributed request protection on Vercel", () => {
    expect(evaluateReadiness({ VERCEL: "1", TRAVELPAYOUTS_API_TOKEN: "token" }, now)).toMatchObject({
      status: "not-ready",
      checks: { flightInventory: "unavailable", requestProtection: "misconfigured", locationData: "ready" },
    });
  });

  it("accepts complete TravelPayouts and distributed protection configuration", () => {
    expect(evaluateReadiness({
      VERCEL: "1",
      RATE_LIMIT_BACKEND: "upstash",
      UPSTASH_REDIS_REST_URL: "https://redis.example",
      UPSTASH_REDIS_REST_TOKEN: "token",
      RATE_LIMIT_KEY_SECRET: "a-secure-secret-that-is-at-least-32-characters",
      TRAVELPAYOUTS_API_TOKEN: "token",
    }, now)).toMatchObject({
      status: "ready",
      checks: { flightInventory: "unavailable", requestProtection: "ready", locationData: "ready" },
    });
  });
});
