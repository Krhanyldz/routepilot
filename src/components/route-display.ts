import type { DemoComparison } from "@/application/demo-search";

export type DisplayRoute = NonNullable<DemoComparison["recommended"]>;

export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  return remaining === 0 ? `${hours}h` : `${hours}h ${remaining}m`;
}

export function routeRisk(route: DisplayRoute): { label: "Low risk" | "Medium risk" | "Higher risk"; tone: string } {
  if (route.legs.some((leg) => leg.selfTransfer)) return { label: "Higher risk", tone: "amber" };
  if (route.totalTransfers >= 2) return { label: "Medium risk", tone: "blue" };
  return { label: "Low risk", tone: "green" };
}

export function routeSavings(comparison: DemoComparison): number {
  const baseline = comparison.alternatives[0]?.totalCost;
  return comparison.recommended && baseline ? Math.max(0, baseline - comparison.recommended.totalCost) : 0;
}
