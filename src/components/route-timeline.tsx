import { TransportIcon } from "./icons";
import { formatDuration, type DisplayRoute } from "./route-display";

const providerNames: Record<string, string> = {
  "demo-flights": "RoutePilot Demo Air",
  "demo-trains": "RoutePilot Demo Rail",
  "demo-ferries": "RoutePilot Demo Ferry",
};

export function RouteTimeline({ route }: { route: DisplayRoute }) {
  return <div className="relative">
    {route.legs.map((leg, index) => <div key={leg.id} className="relative grid grid-cols-[2.75rem_1fr_auto] gap-3 pb-7 last:pb-0">
      {index < route.legs.length - 1 && <span className="absolute bottom-0 left-[1.35rem] top-11 border-l border-dashed border-slate-300 dark:border-slate-600" />}
      <span className="relative z-10 grid size-11 place-items-center rounded-xl border border-slate-200 bg-white text-indigo-600 shadow-sm dark:border-white/10 dark:bg-[#182131] dark:text-indigo-400"><TransportIcon mode={leg.mode} className="size-5" /></span>
      <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><strong className="text-sm text-slate-900 dark:text-white">{leg.from} → {leg.to}</strong>{leg.positioning && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:bg-white/8 dark:text-slate-400">Positioning</span>}</div><p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{providerNames[leg.providerId] ?? leg.providerId} · {formatDuration(leg.durationMinutes)} · Demo data</p></div>
      <strong className="text-sm text-slate-900 dark:text-white">{leg.price === 0 ? "Included" : `€${leg.price}`}</strong>
    </div>)}
    <div className="ml-[3.5rem] mt-5 flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white"><span className="size-2 rounded-full bg-emerald-500" />Arrive in {route.legs.at(-1)?.to}</div>
  </div>;
}
