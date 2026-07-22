import { createRequestProtection } from "@/server/request-protection";
import { configureTravelpayoutsLocationSearch } from "@/providers/production/travelpayouts";

type Environment = Record<string, string | undefined>;
type CheckStatus = "ready" | "unavailable" | "misconfigured";

export interface ReadinessReport {
  status: "ready" | "not-ready";
  checks: {
    flightInventory: CheckStatus;
    requestProtection: CheckStatus;
    locationData: CheckStatus;
  };
  checkedAt: string;
}

export function evaluateReadiness(
  environment: Environment = process.env,
  now: () => Date = () => new Date(),
): ReadinessReport {
  const locationData = configured(() => configureTravelpayoutsLocationSearch(environment));
  const requestProtection = configured(() => createRequestProtection(environment));
  return report(requestProtection, locationData, now);
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
  requestProtection: CheckStatus,
  locationData: CheckStatus,
  now: () => Date,
): ReadinessReport {
  return {
    status: [requestProtection, locationData].includes("misconfigured") ? "not-ready" : "ready",
    checks: { flightInventory: "unavailable", requestProtection, locationData },
    checkedAt: now().toISOString(),
  };
}
