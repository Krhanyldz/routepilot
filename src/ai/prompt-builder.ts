import type { RankedRoutesEvidence } from "./route-evidence";

export interface ExplanationPrompt {
  system: string;
  payload: string;
}

/** Accepts only sanitized route evidence, never offers or provider payloads. */
export function buildRouteExplanationPrompt(evidence: RankedRoutesEvidence): ExplanationPrompt {
  const payload = {
    requestId: evidence.requestId,
    routes: evidence.routes.map((route) => ({
      routeId: route.routeId,
      categories: route.categories,
      totalPrice: route.totalPriceDisplay,
      totalDuration: route.totalDurationDisplay,
      transfers: route.transferCount,
      risk: route.riskLabel,
      legs: route.legs,
      approvedFacts: route.explanationEvidence,
      dataStatus: route.dataStatus,
    })),
  };

  return {
    system: [
      "Explain only the structured, validated RoutePilot evidence supplied.",
      "Repeat display-ready prices and durations exactly; never calculate or infer them.",
      "Do not invent routes, schedules, availability, visa rules, risks, or provider policies.",
      "Do not claim self-transfer protection unless an approved fact states it.",
      "Preserve demo-data labels.",
    ].join(" "),
    payload: JSON.stringify(payload),
  };
}
