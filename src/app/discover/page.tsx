import Link from "next/link";
import { ArrowIcon, PlaneIcon, TrainIcon } from "@/components/icons";

const trips = [
  { from: "Hamburg", to: "Tokyo", price: 419, saving: 186, tag: "Long-haul steal", gradient: "from-violet-500 to-indigo-800", modes: "Flight via Helsinki" },
  { from: "Bremen", to: "Gdansk", price: 54, saving: 72, tag: "Weekend", gradient: "from-cyan-500 to-blue-700", modes: "Train + flight" },
  { from: "Amsterdam", to: "New York", price: 329, saving: 144, tag: "Popular", gradient: "from-rose-500 to-orange-600", modes: "Direct flight" },
  { from: "Hannover", to: "Riga", price: 79, saving: 91, tag: "Hidden fare", gradient: "from-emerald-500 to-teal-800", modes: "Direct flight" },
] as const;

export default function DiscoverPage() {
  return <main className="min-h-[calc(100vh-4rem)] bg-slate-50 px-5 py-14 dark:bg-[#080d18] sm:px-8 sm:py-20">
    <div className="mx-auto max-w-7xl"><div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><p className="text-xs font-bold uppercase tracking-[0.2em] text-indigo-600 dark:text-indigo-400">Curated demo routes</p><h1 className="mt-3 text-4xl font-semibold tracking-[-0.04em] text-slate-950 sm:text-5xl dark:text-white">Discover your next detour.</h1><p className="mt-4 max-w-xl text-slate-600 dark:text-slate-400">A little inspiration from alternative airports and unexpected connections. Prices shown are demo data.</p></div><Link href="/" className="flex items-center gap-2 text-sm font-semibold text-indigo-600 dark:text-indigo-400">Search your own route <ArrowIcon className="size-4" /></Link></div>
      <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">{trips.map((trip) => <article key={trip.to} className="group overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl dark:border-white/10 dark:bg-[#111827]"><div className={`relative h-48 bg-gradient-to-br ${trip.gradient} p-5 text-white`}><div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_10%,rgba(255,255,255,0.35),transparent_25%)]"/><span className="relative rounded-full bg-black/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider backdrop-blur">🔥 {trip.tag}</span><div className="absolute bottom-5 left-5 right-5"><div className="flex items-center gap-2 text-2xl font-semibold tracking-tight"><span>{trip.from}</span><ArrowIcon className="size-5 opacity-70"/><span>{trip.to}</span></div></div></div><div className="p-5"><div className="flex items-end justify-between"><div><span className="text-xs text-slate-400">From</span><strong className="block text-2xl text-slate-950 dark:text-white">€{trip.price}</strong></div><span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">Save €{trip.saving}</span></div><div className="mt-4 flex items-center gap-2 border-t border-slate-100 pt-4 text-xs text-slate-500 dark:border-white/8 dark:text-slate-400">{trip.modes.includes("Train") ? <TrainIcon className="size-4"/> : <PlaneIcon className="size-4"/>}{trip.modes} · Demo</div></div></article>)}</div>
    </div>
  </main>;
}
