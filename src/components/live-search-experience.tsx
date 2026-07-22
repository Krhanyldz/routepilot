"use client";

import { useState } from "react";
import { LiveSearchClientError, searchLiveFlights, type LocationOption } from "@/application/live-search-client";
import type { LiveFlightSearchResult } from "@/providers/live-flight";
import { CalendarIcon, PlaneIcon, SearchIcon } from "./icons";
import { LocationAutocomplete } from "./location-autocomplete";
import { formatDuration } from "./route-display";

export function LiveSearchExperience() {
  const [origin, setOrigin] = useState<LocationOption | null>(null);
  const [destination, setDestination] = useState<LocationOption | null>(null);
  const [departureDate, setDepartureDate] = useState("2026-09-10");
  const [returnDate, setReturnDate] = useState("2026-09-17");
  const [adults, setAdults] = useState(1);
  const [result, setResult] = useState<LiveFlightSearchResult | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [error, setError] = useState("");

  const submit = async (): Promise<void> => {
    if (!origin || !destination) { setStatus("error"); setError("Choose an origin and destination from the suggestions."); return; }
    if (origin.iataCode === destination.iataCode) { setStatus("error"); setError("Origin and destination must be different."); return; }
    setStatus("loading"); setError(""); setResult(null);
    try {
      setResult(await searchLiveFlights({
        originIataCode: origin.iataCode,
        destinationIataCode: destination.iataCode,
        departureDate,
        ...(returnDate ? { returnDate } : {}),
        adults,
      }));
      setStatus("idle");
    } catch (caught) {
      const reason = caught instanceof LiveSearchClientError ? caught.reason : "request-failed";
      setError(publicError(reason));
      setStatus("error");
    }
  };

  return <main>
    <section className="border-b border-slate-200/70 bg-[radial-gradient(circle_at_75%_15%,rgba(99,102,241,0.15),transparent_32%),linear-gradient(to_bottom,#f8fafc,#eef2ff_70%,#f8fafc)] px-5 pb-20 pt-16 dark:border-white/8 dark:bg-[linear-gradient(to_bottom,#080d18,#0d1323_75%,#080d18)] sm:px-8 sm:pt-24">
      <div className="mx-auto max-w-7xl"><div className="mx-auto max-w-3xl text-center"><span className="inline-flex rounded-full border border-emerald-200 bg-white/70 px-3 py-1.5 text-xs font-semibold text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-300">Live Amadeus inventory · Provider-limited coverage</span><h1 className="mt-7 text-balance text-4xl font-semibold tracking-[-0.05em] text-slate-950 sm:text-6xl dark:text-white">Search verified live flight offers.</h1><p className="mx-auto mt-5 max-w-2xl text-slate-600 dark:text-slate-300">Choose canonical airports, compare current provider evidence, and keep every limitation visible.</p></div>
      <form onSubmit={(event) => { event.preventDefault(); void submit(); }} className="mt-12 rounded-[1.75rem] border border-slate-200/80 bg-white p-3 shadow-[0_24px_70px_-24px_rgba(15,23,42,0.3)] dark:border-white/10 dark:bg-[#111827]"><div className="grid lg:grid-cols-[1fr_1fr_0.8fr_0.8fr_0.55fr_auto]"><LocationAutocomplete label="Origin" value={origin} onChange={setOrigin}/><LocationAutocomplete label="Destination" value={destination} onChange={setDestination}/><DateField label="Departure" value={departureDate} onChange={setDepartureDate}/><DateField label="Return" value={returnDate} min={departureDate} onChange={setReturnDate}/><label className="flex min-h-20 flex-col justify-center rounded-2xl px-4 lg:border-r lg:border-slate-100 dark:lg:border-white/8"><span className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Adults</span><select aria-label="Adults" value={adults} onChange={(event) => setAdults(Number(event.target.value))} className="bg-transparent text-[15px] font-semibold outline-none dark:text-white">{[1,2,3,4,5,6,7,8,9].map((count) => <option key={count}>{count}</option>)}</select></label><button disabled={status === "loading"} className="m-1 flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-7 font-semibold text-white hover:bg-indigo-500 disabled:opacity-60"><SearchIcon className="size-5"/>{status === "loading" ? "Searching…" : "Search"}</button></div></form>
      {status === "error" && <p role="alert" className="mx-auto mt-4 max-w-2xl rounded-xl bg-rose-50 p-3 text-center text-sm text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">{error}</p>}</div>
    </section>
    <section className="bg-slate-50 px-5 py-14 dark:bg-[#080d18] sm:px-8"><div className="mx-auto max-w-6xl">{status === "loading" ? <LiveLoading/> : result ? <LiveResults result={result}/> : <LiveIntro/>}</div></section>
  </main>;
}

function DateField({ label, value, min, onChange }: { label: string; value: string; min?: string; onChange: (value: string) => void }) {
  return <label className="flex min-h-20 items-center gap-3 rounded-2xl px-4 lg:border-r lg:border-slate-100 dark:lg:border-white/8"><CalendarIcon className="size-5 text-slate-400"/><span className="min-w-0"><span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-slate-400">{label}</span><input aria-label={label} required={label === "Departure"} type="date" min={min} value={value} onChange={(event) => onChange(event.target.value)} className="w-full bg-transparent text-sm font-semibold outline-none dark:text-white [&::-webkit-calendar-picker-indicator]:dark:invert"/></span></label>;
}

function LiveResults({ result }: { result: LiveFlightSearchResult }) {
  return <section aria-live="polite"><div className="mb-6 flex flex-wrap items-end justify-between gap-3"><div><p className="text-sm font-semibold text-emerald-600">Live provider evidence</p><h2 className="mt-1 text-2xl font-semibold text-slate-950 dark:text-white">{result.offers.length} flight offer{result.offers.length === 1 ? "" : "s"}</h2></div><span className="text-xs text-slate-500">Fetched {new Date(result.fetchedAt).toLocaleString()}</span></div>{result.warnings.map((warning) => <p key={warning} className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-200">{warning}</p>)}<div className="space-y-4">{result.offers.length ? result.offers.map((offer) => <article key={offer.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#111827]"><div className="flex flex-col justify-between gap-4 sm:flex-row"><div><span className="text-xs font-bold uppercase tracking-wider text-emerald-600">Live · {offer.providerId}</span><h3 className="mt-2 text-lg font-semibold text-slate-950 dark:text-white">{offer.segments[0]?.departureIataCode} → {offer.segments.at(-1)?.arrivalIataCode}</h3><p className="mt-1 text-sm text-slate-500">{formatDuration(offer.totalDurationMinutes)} · {offer.transfers} transfer{offer.transfers === 1 ? "" : "s"} · {offer.validatingAirlineCodes.join(", ") || "Carrier unavailable"}</p></div><div className="sm:text-right"><strong className="text-3xl text-slate-950 dark:text-white">{offer.currencyCode} {offer.totalPrice}</strong><p className="mt-1 text-xs text-slate-500">Provider total · booking not sold by RoutePilot</p></div></div><ol className="mt-5 grid gap-2 border-t border-slate-100 pt-4 dark:border-white/8">{offer.segments.map((segment) => <li key={segment.id} className="flex flex-wrap items-center justify-between gap-2 text-sm"><span className="font-semibold text-slate-800 dark:text-slate-200">{segment.departureIataCode} {formatTime(segment.departureAt)} → {segment.arrivalIataCode} {formatTime(segment.arrivalAt)}</span><span className="text-slate-500">{segment.marketingCarrierCode} {segment.flightNumber}</span></li>)}</ol></article>) : <p className="rounded-2xl border border-dashed border-slate-300 p-10 text-center text-slate-500">No offers were returned for these dates.</p>}</div></section>;
}

function LiveIntro() { return <div className="grid min-h-72 place-items-center rounded-3xl border border-dashed border-slate-300 text-center dark:border-white/15"><div><PlaneIcon className="mx-auto size-8 text-indigo-500"/><h2 className="mt-4 text-xl font-semibold dark:text-white">Choose two airports to begin</h2><p className="mt-2 text-sm text-slate-500">Live mode never mixes deterministic demo fares into these results.</p></div></div>; }
function LiveLoading() { return <div aria-label="Searching live flights" className="h-72 animate-pulse rounded-3xl bg-slate-200/70 dark:bg-white/8"/>; }
function formatTime(value: string): string { return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)); }
function publicError(reason: string): string {
  if (reason === "request-rate-limit" || reason === "provider-budget-exhausted") return "Search capacity is busy. Please wait a moment and try again.";
  if (reason === "live-mode-disabled" || reason === "provider-misconfigured") return "Live search is not configured yet.";
  if (reason === "timeout") return "The travel provider took too long to respond. Please try again.";
  return "Live search is temporarily unavailable. Please try again.";
}
