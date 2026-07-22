import type { Route } from "@/domain/models";

export interface ExplanationContext {
  recommended: Route;
  direct: Route | null;
  hasDeutschlandticket: boolean;
}

export function generateRouteExplanations(context: ExplanationContext): string[] {
  const explanations: string[] = [];
  const positioning = context.recommended.legs.find((leg) => leg.positioning);

  if (positioning && context.direct && context.recommended.totalCost < context.direct.totalCost) {
    const savings = context.direct.totalCost - context.recommended.totalCost;
    explanations.push(`${positioning.toLocationId === "airport-hamburg" ? "Hamburg" : "Alternative departure point"}’dan çıkmak toplam €${savings} tasarruf sağlıyor.`);
    explanations.push(`The alternative departure airport is cheaper and saves €${savings} overall.`);
  }
  if (positioning?.deutschlandticketEligible && context.hasDeutschlandticket && positioning.basePrice > positioning.price) {
    explanations.push(`The Deutschlandticket reduced the positioning cost from €${positioning.basePrice} to €0.`);
  }
  if (context.direct && context.direct.totalDurationMinutes < context.recommended.totalDurationMinutes && context.direct.totalCost > context.recommended.totalCost) {
    explanations.push("The direct route was faster but more expensive.");
  }

  const lastLeg = context.recommended.legs.at(-1);
  if (lastLeg?.mode === "train") {
    explanations.push("The train was cheaper than the comparable flight for the final leg.");
  }
  if (context.recommended.legs.some((leg) => leg.selfTransfer)) {
    explanations.push("A self-transfer lowers the fare but increases connection risk.");
  }

  return explanations;
}
