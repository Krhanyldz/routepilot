import type { ExplanationEvidence, RankedRouteEvidence } from "./route-evidence";

/** Renders engine-supplied facts. It does not derive prices, durations, rankings, or risk. */
export function explainRoute(route: RankedRouteEvidence): string[] {
  return route.explanationEvidence.map(renderEvidence);
}

function renderEvidence(evidence: ExplanationEvidence): string {
  switch (evidence.kind) {
    case "positioning-savings":
      return evidence.deutschlandticketMakesPositioningFree
        ? `${evidence.departureName} departure saves ${evidence.savingsDisplay} because Deutschlandticket makes positioning free.`
        : `${evidence.departureName} departure saves ${evidence.savingsDisplay} after positioning costs.`;
    case "cheaper-mode":
      return `${capitalize(evidence.selectedMode)} from ${evidence.from} to ${evidence.to} is cheaper than the available ${evidence.alternativeMode}.`;
    case "slower-but-saves":
      return `This route is slower but saves ${evidence.savingsDisplay}.`;
    case "self-transfer":
      return evidence.message;
  }
}

function capitalize(value: string): string {
  return `${value.charAt(0).toUpperCase()}${value.slice(1)}`;
}
