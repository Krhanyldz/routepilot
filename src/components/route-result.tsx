"use client";

import { useState } from "react";
import type { DemoComparison, DemoDestination } from "@/application/demo-search";
import { PlaneIcon, ShieldIcon, SlidersIcon, TransportIcon } from "./icons";
import { RouteComparison } from "./route-comparison";
import { formatDuration, routeRisk, routeSavings } from "./route-display";
import { RouteTimeline } from "./route-timeline";

const filters = ["Cheapest", "Fastest", "Best value", "Fewest transfers", "Lowest risk"] as const;

export function RouteResult({ destination, comparison, overBudget }: { destination: DemoDestination; comparison: DemoComparison; overBudget: boolean }) {
  const [filter, setFilter] = useState<(typeof filters)[number]>("Best value");
  const [bookingNotice, setBookingNotice] = useState(false);
  const route = comparison.recommended;
  if (!route || overBudget) return <RouteEmptyState overBudget={overBudget} />;
  const risk = routeRisk(route);
  const savings = routeSavings(comparison);

  return <section aria-live="polite" className="space-y-5">
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-sm font-medium text-slate-500 dark:text-slate-400">1 optimized demo route</p><h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950 dark:text-white">Bremen to {destination}</h2></div><div className="flex gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-white p-1 dark:border-white/10 dark:bg-[#111827]">{filters.map((item) => <button type="button" key={item} onClick={() => setFilter(item)} className={`shrink-0 rounded-lg px-3 py-2 text-xs font-semibold transition ${filter === item ? "bg-slate-900 text-white shadow-sm dark:bg-white dark:text-slate-950" : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"}`}>{item}</button>)}</div></div>
    <RouteComparison comparison={comparison} />
    <article className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-[0_18px_50px_-32px_rgba(15,23,42,0.45)] dark:border-white/10 dark:bg-[#111827]">
      <div className="border-b border-slate-100 p-5 sm:p-7 dark:border-white/8">
        <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-start"><div><div className="mb-4 flex flex-wrap items-center gap-2"><span className="rounded-full bg-indigo-50 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300">Best value · Demo</span><span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${risk.tone === "amber" ? "bg-amber-50 text-amber-700 dark:bg-amber-400/10 dark:text-amber-300" : "bg-emerald-50 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300"}`}><ShieldIcon className="mr-1 inline size-3" />{risk.label}</span></div><div className="flex items-center gap-2 text-slate-400">{route.legs.map((leg, index) => <span key={leg.id} className="flex items-center gap-2"><span className="grid size-9 place-items-center rounded-lg bg-slate-100 text-slate-700 dark:bg-white/8 dark:text-slate-200"><TransportIcon mode={leg.mode} className="size-4" /></span>{index < route.legs.length - 1 && <span className="h-px w-3 bg-slate-300 dark:bg-slate-600" />}</span>)}</div><h3 className="mt-4 text-xl font-semibold text-slate-950 dark:text-white">Bremen <span className="mx-1 text-slate-300">→</span> {destination}</h3><div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm text-slate-500 dark:text-slate-400"><span>{formatDuration(route.totalDurationMinutes)}</span><span>{route.totalTransfers} transfer{route.totalTransfers === 1 ? "" : "s"}</span><span>{route.legs.length} segments</span></div></div>
          <div className="sm:text-right"><span className="text-xs font-medium text-slate-400">Total journey</span><strong className="block text-4xl font-semibold tracking-[-0.04em] text-slate-950 dark:text-white">€{route.totalCost}</strong>{savings > 0 && <span className="mt-1 block text-sm font-semibold text-emerald-600 dark:text-emerald-400">Save €{savings}</span>}<button type="button" onClick={() => setBookingNotice(true)} className="mt-4 w-full rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-500 sm:w-auto">Book route</button></div></div>
        {bookingNotice && <div role="status" className="mt-5 rounded-xl bg-indigo-50 p-3 text-sm text-indigo-800 dark:bg-indigo-500/10 dark:text-indigo-200">Booking is intentionally unavailable in this demo. No live provider API is connected yet.</div>}
      </div>
      <div className="grid lg:grid-cols-[1.25fr_0.75fr]"><div className="border-b border-slate-100 p-5 sm:p-7 lg:border-b-0 lg:border-r dark:border-white/8"><h4 className="mb-6 text-sm font-semibold text-slate-950 dark:text-white">Route timeline</h4><RouteTimeline route={route} /></div><aside className="p-5 sm:p-7"><h4 className="flex items-center gap-2 text-sm font-semibold text-slate-950 dark:text-white"><SlidersIcon className="size-4 text-indigo-500" />Cheaper because…</h4><ul className="mt-4 space-y-3">{comparison.explanations.map((explanation) => <li key={explanation} className="flex gap-2 text-sm leading-6 text-slate-600 dark:text-slate-300"><span className="mt-2 size-1.5 shrink-0 rounded-full bg-emerald-500" />{explanation}</li>)}</ul><button type="button" className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/5"><PlaneIcon className="size-4" />View fare details</button></aside></div>
    </article>
  </section>;
}

export function RouteLoadingState() {
  return <div aria-label="Searching routes" className="space-y-5 animate-pulse"><div className="h-16 rounded-2xl bg-slate-200/70 dark:bg-white/8"/><div className="rounded-[1.75rem] border border-slate-200 bg-white p-7 dark:border-white/10 dark:bg-[#111827]"><div className="flex justify-between"><div className="space-y-3"><div className="h-5 w-28 rounded bg-slate-200 dark:bg-white/10"/><div className="h-8 w-52 rounded bg-slate-200 dark:bg-white/10"/></div><div className="h-14 w-24 rounded bg-slate-200 dark:bg-white/10"/></div><div className="mt-10 space-y-5">{[1,2,3].map((item) => <div key={item} className="flex gap-4"><div className="size-11 rounded-xl bg-slate-200 dark:bg-white/10"/><div className="flex-1 space-y-2"><div className="h-4 w-1/3 rounded bg-slate-200 dark:bg-white/10"/><div className="h-3 w-1/2 rounded bg-slate-100 dark:bg-white/5"/></div></div>)}</div></div></div>;
}

export function RouteEmptyState({ overBudget = false }: { overBudget?: boolean }) {
  return <div className="grid min-h-[28rem] place-items-center rounded-[1.75rem] border border-dashed border-slate-300 bg-white/60 p-8 text-center dark:border-white/15 dark:bg-white/[0.03]"><div><span className="mx-auto grid size-14 place-items-center rounded-2xl bg-slate-100 text-slate-500 dark:bg-white/8 dark:text-slate-300"><PlaneIcon className="size-6" /></span><h2 className="mt-5 text-xl font-semibold text-slate-950 dark:text-white">{overBudget ? "No routes within your budget" : "No routes match these filters"}</h2><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500 dark:text-slate-400">{overBudget ? "Try increasing the maximum budget to see the optimized demo route." : "Increase your search radius, duration, or transfer limit and keep train and flight connections available."}</p></div></div>;
}
