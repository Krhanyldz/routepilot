import { ALTERNATIVE_CATEGORIES, type AlternativeCategory, type RankedRoutesEvidence } from "./route-evidence";

export interface RouteAlternativeExplanation {
  category: AlternativeCategory;
  routeId: string | null;
  explanation: string;
}

/** Describes engine-assigned alternatives; it never ranks or compares routes itself. */
export function generateAlternativeExplanations(evidence: RankedRoutesEvidence): RouteAlternativeExplanation[] {
  return ALTERNATIVE_CATEGORIES.map((category) => {
    const route = evidence.routes.find((candidate) => candidate.categories.includes(category));
    if (!route) return { category, routeId: null, explanation: `No validated ${displayCategory(category)} alternative is available.` };
    return {
      category,
      routeId: route.routeId,
      explanation: `${displayCategory(category)}: ${route.totalPriceDisplay}, ${route.totalDurationDisplay}, ${route.transferCount} transfer${route.transferCount === 1 ? "" : "s"}, ${route.riskLabel}.`,
    };
  });
}

function displayCategory(category: AlternativeCategory): string {
  const labels: Record<AlternativeCategory, string> = {
    cheapest: "Cheapest",
    fastest: "Fastest",
    "lowest-risk": "Lowest risk",
    "fewest-transfers": "Fewest transfers",
    "best-value": "Best value",
  };
  return labels[category];
}
