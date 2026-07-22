import { configureFlightInventory } from "@/providers/production/amadeus";
import { createRequestProtection } from "@/server/request-protection";

type Environment = Record<string, string | undefined>;
type CheckStatus = "ready" | "not-required" | "misconfigured";

export interface ReadinessReport {
  status: "ready" | "not-ready";
  mode: "demo" | "live" | "invalid";
  checks: {
    flightInventory: CheckStatus;
    requestProtection: CheckStatus;
  };
  checkedAt: string;
}

export function evaluateReadiness(
  environment: Environment = process.env,
  now: () => Date = () => new Date(),
): ReadinessReport {
  const mode = environment.ROUTE_DATA_MODE ?? "demo";
  if (mode !== "demo" && mode !== "live") return report("invalid", "misconfigured", "misconfigured", now);
  if (mode === "demo") return report(mode, "not-required", "not-required", now);

  const flightInventory = configured(() => configureFlightInventory(environment));
  const requestProtection = configured(() => createRequestProtection(environment));
  return report(mode, flightInventory, requestProtection, now);
}

function configured(operation: () => unknown): CheckStatus {
  try {
    operation();
    return "ready";
  } catch {
    return "misconfigured";
  }
}

function report(
  mode: ReadinessReport["mode"],
  flightInventory: CheckStatus,
  requestProtection: CheckStatus,
  now: () => Date,
): ReadinessReport {
  return {
    status: flightInventory === "misconfigured" || requestProtection === "misconfigured" ? "not-ready" : "ready",
    mode,
    checks: { flightInventory, requestProtection },
    checkedAt: now().toISOString(),
  };
}
