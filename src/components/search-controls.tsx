import type { DemoDestination } from "@/application/demo-search";
import type { SearchConstraints } from "@/domain/models";
import { CalendarIcon, PinIcon, SearchIcon, SlidersIcon } from "./icons";

export interface SearchFormValue {
  destination: DemoDestination;
  constraints: SearchConstraints;
  departureDate: string;
  returnDate: string;
  maximumBudget: number;
}

interface SearchControlsProps {
  value: SearchFormValue;
  loading: boolean;
  onChange: (value: SearchFormValue) => void;
  onSearch: () => void;
}

const inputClass = "w-full bg-transparent text-[15px] font-semibold text-slate-950 outline-none dark:text-white [&::-webkit-calendar-picker-indicator]:dark:invert";

export function SearchControls({ value, loading, onChange, onSearch }: SearchControlsProps) {
  const update = (changes: Partial<SearchFormValue>): void => onChange({ ...value, ...changes });
  const updateConstraints = (changes: Partial<SearchConstraints>): void => update({ constraints: { ...value.constraints, ...changes } });

  return <form onSubmit={(event) => { event.preventDefault(); onSearch(); }} className="rounded-[1.75rem] border border-slate-200/80 bg-white p-3 shadow-[0_24px_70px_-24px_rgba(15,23,42,0.3)] dark:border-white/10 dark:bg-[#111827] dark:shadow-black/30">
    <div className="grid lg:grid-cols-[1fr_1fr_0.85fr_0.85fr_auto]">
      <SearchField icon={<PinIcon />} label="Origin"><input aria-label="Origin" value="Bremen" readOnly className={inputClass} /></SearchField>
      <SearchField icon={<PinIcon />} label="Destination"><select aria-label="Destination" value={value.destination} onChange={(event) => update({ destination: event.target.value as DemoDestination })} className={inputClass}><option>Antalya</option><option>Baotou</option></select></SearchField>
      <SearchField icon={<CalendarIcon />} label="Departure"><input aria-label="Departure" type="date" value={value.departureDate} onChange={(event) => update({ departureDate: event.target.value })} className={inputClass} /></SearchField>
      <SearchField icon={<CalendarIcon />} label="Return"><input aria-label="Return" type="date" min={value.departureDate} value={value.returnDate} onChange={(event) => update({ returnDate: event.target.value })} className={inputClass} /></SearchField>
      <button disabled={loading} className="m-1 flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-7 font-semibold text-white shadow-lg shadow-indigo-600/20 transition hover:bg-indigo-500 disabled:cursor-wait disabled:opacity-70 lg:min-h-0"><SearchIcon className="size-5" />{loading ? "Searching…" : "Search"}</button>
    </div>

    <div className="mx-2 border-t border-slate-100 dark:border-white/8" />
    <div className="grid gap-3 p-3 sm:grid-cols-2 lg:grid-cols-5">
      <Toggle checked={value.constraints.nearbyDeparturesEnabled} onChange={(checked) => updateConstraints({ nearbyDeparturesEnabled: checked })} label="Nearby departures" />
      <CompactSelect label="Radius" value={value.constraints.radiusKm} disabled={!value.constraints.nearbyDeparturesEnabled} onChange={(selected) => updateConstraints({ radiusKm: Number(selected) as SearchConstraints["radiusKm"] })} options={[50, 100, 150, 250].map((radius) => ({ value: radius, label: `${radius} km` }))} />
      <Toggle checked={value.constraints.hasDeutschlandticket} onChange={(checked) => updateConstraints({ hasDeutschlandticket: checked })} label="Deutschlandticket" />
      <CompactSelect label="Max budget" value={value.maximumBudget} onChange={(selected) => update({ maximumBudget: Number(selected) })} options={[100, 250, 500, 1000].map((budget) => ({ value: budget, label: `€${budget}` }))} />
      <div className="grid grid-cols-2 gap-2">
        <CompactSelect label="Duration" value={value.constraints.maxDurationMinutes} onChange={(selected) => updateConstraints({ maxDurationMinutes: Number(selected) })} options={[{ value: 360, label: "6h" }, { value: 720, label: "12h" }, { value: 1440, label: "24h" }, { value: 2880, label: "48h" }]} />
        <CompactSelect label="Transfers" value={value.constraints.maxTransfers} onChange={(selected) => updateConstraints({ maxTransfers: Number(selected) })} options={[0, 1, 2, 3, 4].map((count) => ({ value: count, label: String(count) }))} />
      </div>
    </div>
    <div className="flex items-center gap-2 px-5 pb-3 text-xs text-slate-400 dark:text-slate-500"><SlidersIcon className="size-3.5" />Demo search · Flights, trains and ferries enabled</div>
  </form>;
}

function SearchField({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return <label className="group flex min-h-20 items-center gap-3 rounded-2xl px-4 transition hover:bg-slate-50 lg:border-r lg:border-slate-100 dark:hover:bg-white/5 dark:lg:border-white/8"><span className="size-5 shrink-0 text-slate-400 [&>svg]:size-5">{icon}</span><span className="min-w-0 flex-1"><span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-slate-400">{label}</span>{children}</span></label>;
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (checked: boolean) => void; label: string }) {
  return <label className="flex min-h-14 cursor-pointer items-center justify-between rounded-xl bg-slate-50 px-3 dark:bg-white/5"><span className="text-sm font-medium text-slate-700 dark:text-slate-200">{label}</span><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="peer sr-only" /><span className="relative h-5 w-9 rounded-full bg-slate-300 transition peer-checked:bg-indigo-600 after:absolute after:left-0.5 after:top-0.5 after:size-4 after:rounded-full after:bg-white after:transition peer-checked:after:translate-x-4 dark:bg-slate-600" /></label>;
}

function CompactSelect({ label, value, onChange, options, disabled = false }: { label: string; value: number; onChange: (value: string) => void; options: Array<{ value: number; label: string }>; disabled?: boolean }) {
  return <label className="flex min-h-14 flex-col justify-center rounded-xl bg-slate-50 px-3 dark:bg-white/5"><span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{label}</span><select aria-label={label} value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)} className="mt-0.5 bg-transparent text-sm font-semibold text-slate-700 outline-none disabled:opacity-40 dark:text-slate-200">{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>;
}
