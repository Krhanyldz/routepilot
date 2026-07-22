import { configureFlightInventory } from "@/providers/production/amadeus";
import { createRequestProtection } from "@/server/request-protection";
import { createProviderBudget } from "@/server/provider-budget";

type Environment = Record<string, string | undefined>;
type CheckStatus = "ready" | "not-required" | "misconfigured";

export interface ReadinessReport {
  status: "ready" | "not-ready";
  mode: "demo" | "live" | "invalid";
  checks: {
    flightInventory: CheckStatus;
    requestProtection: CheckStatus;
    providerBudget: CheckStatus;
  };
  checkedAt: string;
}

export function evaluateReadiness(
  environment: Environment = process.env,
  now: () => Date = () => new Date(),
): ReadinessReport {
  const mode = environment.ROUTE_DATA_MODE ?? "demo";
  if (mode !== "demo" && mode !== "live") return report("invalid", "misconfigured", "misconfigured", "misconfigured", now);
  if (mode === "demo") return report(mode, "not-required", "not-required", "not-required", now);

  const flightInventory = configured(() => configureFlightInventory(environment));
  const requestProtection = configured(() => createRequestProtection(environment));
  const providerBudget = configured(() => createProviderBudget(environment));
  return report(mode, flightInventory, requestProtection, providerBudget, now);
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
  providerBudget: CheckStatus,
  now: () => Date,
): ReadinessReport {
  return {
    status: [flightInventory, requestProtection, providerBudget].includes("misconfigured") ? "not-ready" : "ready",
    mode,
    checks: { flightInventory, requestProtection, providerBudget },
    checkedAt: now().toISOString(),
  };
}
