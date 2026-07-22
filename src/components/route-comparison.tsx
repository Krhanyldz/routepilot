import type { DemoComparison } from "@/application/demo-search";
import { ArrowIcon } from "./icons";
import { routeSavings } from "./route-display";

export function RouteComparison({ comparison }: { comparison: DemoComparison }) {
  const optimized = comparison.recommended;
  const baseline = comparison.alternatives[0];
  if (!optimized || !baseline) return null;
  const savings = routeSavings(comparison);

  return <section aria-label="Route price comparison" className="grid overflow-hidden rounded-2xl border border-slate-200 bg-white sm:grid-cols-[1fr_auto_1fr_auto] dark:border-white/10 dark:bg-[#111827]">
    <PriceCell label={baseline.label.includes("Direct") ? "Direct route" : "Flight alternative"} price={baseline.totalCost} muted />
    <div className="hidden place-items-center text-slate-300 sm:grid dark:text-slate-600"><ArrowIcon className="size-5" /></div>
    <PriceCell label="Optimized route" price={optimized.totalCost} />
    <div className="flex items-center justify-between bg-emerald-50 px-5 py-4 sm:block sm:min-w-36 dark:bg-emerald-500/10"><span className="text-xs font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">You save</span><strong className="block text-xl text-emerald-700 dark:text-emerald-300">€{savings}</strong></div>
  </section>;
}

function PriceCell({ label, price, muted = false }: { label: string; price: number; muted?: boolean }) {
  return <div className="px-5 py-4"><span className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</span><strong className={`mt-1 block text-2xl tracking-tight ${muted ? "text-slate-400 line-through decoration-1" : "text-slate-950 dark:text-white"}`}>€{price}</strong></div>;
}
