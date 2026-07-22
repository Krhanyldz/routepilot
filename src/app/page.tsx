"use client";

import { useMemo, useRef, useState } from "react";
import { defaultSearchConstraints, getDemoComparison } from "@/application/demo-search";
import { RouteLoadingState, RouteResult } from "@/components/route-result";
import { SearchControls, type SearchFormValue } from "@/components/search-controls";

const initialSearch: SearchFormValue = {
  destination: "Antalya",
  constraints: defaultSearchConstraints,
  departureDate: "2026-08-15",
  returnDate: "2026-08-24",
  maximumBudget: 500,
};

export default function Home() {
  const [draft, setDraft] = useState<SearchFormValue>(initialSearch);
  const [applied, setApplied] = useState<SearchFormValue>(initialSearch);
  const [loading, setLoading] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const comparison = useMemo(() => getDemoComparison(applied.destination, applied.constraints), [applied]);

  const search = (): void => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setLoading(true);
    timeoutRef.current = setTimeout(() => {
      setApplied(draft);
      setLoading(false);
    }, 650);
  };

  return <main>
    <section className="relative overflow-hidden border-b border-slate-200/70 bg-[radial-gradient(circle_at_75%_15%,rgba(99,102,241,0.15),transparent_32%),linear-gradient(to_bottom,#f8fafc,#eef2ff_70%,#f8fafc)] px-5 pb-20 pt-16 dark:border-white/8 dark:bg-[radial-gradient(circle_at_75%_15%,rgba(99,102,241,0.18),transparent_35%),linear-gradient(to_bottom,#080d18,#0d1323_75%,#080d18)] sm:px-8 sm:pb-28 sm:pt-24">
      <div className="pointer-events-none absolute left-[8%] top-24 size-64 rounded-full bg-cyan-300/10 blur-3xl" />
      <div className="relative mx-auto max-w-7xl">
        <div className="mx-auto max-w-3xl text-center"><span className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-white/70 px-3 py-1.5 text-xs font-semibold text-indigo-700 shadow-sm dark:border-indigo-400/20 dark:bg-indigo-400/10 dark:text-indigo-300"><span className="size-1.5 rounded-full bg-indigo-500" />Multimodal route intelligence · Demo data</span><h1 className="mt-7 text-balance text-4xl font-semibold tracking-[-0.05em] text-slate-950 sm:text-6xl lg:text-7xl dark:text-white">Better routes start beyond your nearest airport.</h1><p className="mx-auto mt-6 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg dark:text-slate-300">RoutePilot connects trains, flights and nearby departure points to uncover the true cheapest way to travel.</p></div>
        <div className="mt-12"><SearchControls value={draft} loading={loading} onChange={setDraft} onSearch={search} /></div>
        <div className="mt-5 flex flex-wrap items-center justify-center gap-x-7 gap-y-2 text-xs font-medium text-slate-500 dark:text-slate-400"><span>✓ Full positioning cost included</span><span>✓ No hidden live fares</span><span>✓ Deterministic recommendations</span></div>
      </div>
    </section>

    <section id="results" className="bg-slate-50 px-5 py-14 dark:bg-[#080d18] sm:px-8 sm:py-20"><div className="mx-auto max-w-6xl">{loading ? <RouteLoadingState /> : <RouteResult destination={applied.destination} comparison={comparison} overBudget={(comparison.recommended?.totalCost ?? 0) > applied.maximumBudget} />}</div></section>

    <section className="border-t border-slate-200 bg-white px-5 py-16 dark:border-white/8 dark:bg-[#0b111d] sm:px-8"><div className="mx-auto grid max-w-6xl gap-8 sm:grid-cols-3"><Value title="Door-to-door pricing" text="Every recommendation includes the cost of reaching an alternative departure point."/><Value title="Constraints that matter" text="Set your actual budget, travel time and appetite for transfers before comparing."/><Value title="Transparent by design" text="Every current fare is visibly labeled demo data until real provider integrations arrive."/></div></section>
  </main>;
}

function Value({ title, text }: { title: string; text: string }) {
  return <div><span className="mb-4 block h-px w-10 bg-indigo-500"/><h2 className="font-semibold text-slate-950 dark:text-white">{title}</h2><p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">{text}</p></div>;
}
