import type { TransportMode } from "@/domain/models";

export const ALTERNATIVE_CATEGORIES = ["cheapest", "fastest", "lowest-risk", "fewest-transfers", "best-value"] as const;
export type AlternativeCategory = (typeof ALTERNATIVE_CATEGORIES)[number];

export interface RouteLegEvidence {
  from: string;
  to: string;
  mode: TransportMode;
}

export type ExplanationEvidence =
  | { kind: "positioning-savings"; departureName: string; savingsDisplay: string; deutschlandticketMakesPositioningFree: boolean }
  | { kind: "cheaper-mode"; from: string; to: string; selectedMode: TransportMode; alternativeMode: TransportMode }
  | { kind: "slower-but-saves"; savingsDisplay: string }
  | { kind: "self-transfer"; message: string };

/** All numeric decisions and labels in this contract are produced by deterministic routing/scoring code. */
export interface RankedRouteEvidence {
  routeId: string;
  categories: readonly AlternativeCategory[];
  totalPriceDisplay: string;
  totalDurationDisplay: string;
  transferCount: number;
  riskLabel: string;
  legs: readonly RouteLegEvidence[];
  explanationEvidence: readonly ExplanationEvidence[];
  dataStatus: "demo" | "live";
}

export interface RankedRoutesEvidence {
  requestId: string;
  routes: readonly RankedRouteEvidence[];
}

export interface StrategistRouteEngine {
  search(request: import("./travel-request").TravelRequest): Promise<RankedRoutesEvidence>;
}
