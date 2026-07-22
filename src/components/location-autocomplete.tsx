"use client";

import { useEffect, useId, useRef, useState } from "react";
import { searchLiveLocations, type LocationOption } from "@/application/live-search-client";
import { PinIcon } from "./icons";

export function LocationAutocomplete({
  label,
  value,
  onChange,
}: {
  label: string;
  value: LocationOption | null;
  onChange: (location: LocationOption | null) => void;
}) {
  const id = useId();
  const [query, setQuery] = useState(value ? display(value) : "");
  const [options, setOptions] = useState<readonly LocationOption[]>([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const selectedText = useRef(value ? display(value) : "");

  useEffect(() => {
    if (query === selectedText.current || query.trim().length < 2) {
      setOptions([]);
      setStatus("idle");
      return;
    }
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      setStatus("loading");
      searchLiveLocations(query.trim(), controller.signal)
        .then((results) => { setOptions(results); setActiveIndex(results.length ? 0 : -1); setStatus("idle"); })
        .catch(() => { if (!controller.signal.aborted) { setOptions([]); setStatus("error"); } });
    }, 300);
    return () => { clearTimeout(timeout); controller.abort(); };
  }, [query]);

  const choose = (option: LocationOption): void => {
    const text = display(option);
    selectedText.current = text;
    setQuery(text);
    setOptions([]);
    setActiveIndex(-1);
    onChange(option);
  };

  return <div className="relative flex min-h-20 items-center gap-3 rounded-2xl px-4 transition hover:bg-slate-50 lg:border-r lg:border-slate-100 dark:hover:bg-white/5 dark:lg:border-white/8">
    <span className="size-5 shrink-0 text-slate-400"><PinIcon /></span>
    <label className="min-w-0 flex-1" htmlFor={`${id}-input`}><span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-slate-400">{label}</span><input
      id={`${id}-input`}
      role="combobox"
      aria-autocomplete="list"
      aria-expanded={options.length > 0}
      aria-controls={`${id}-listbox`}
      aria-activedescendant={activeIndex >= 0 ? `${id}-option-${activeIndex}` : undefined}
      autoComplete="off"
      value={query}
      onChange={(event) => { selectedText.current = ""; setQuery(event.target.value); onChange(null); }}
      onKeyDown={(event) => {
        if (event.key === "ArrowDown") { event.preventDefault(); setActiveIndex((index) => Math.min(options.length - 1, index + 1)); }
        if (event.key === "ArrowUp") { event.preventDefault(); setActiveIndex((index) => Math.max(0, index - 1)); }
        if (event.key === "Enter" && activeIndex >= 0 && options[activeIndex]) { event.preventDefault(); choose(options[activeIndex]); }
        if (event.key === "Escape") setOptions([]);
      }}
      placeholder="City or airport"
      className="w-full bg-transparent text-[15px] font-semibold text-slate-950 outline-none placeholder:font-normal placeholder:text-slate-400 dark:text-white"
    /></label>
    {status === "loading" && <span className="absolute right-4 top-3 text-[10px] text-slate-400">Searching…</span>}
    {status === "error" && <span role="status" className="absolute left-4 top-full z-30 mt-1 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700 shadow">Location search unavailable</span>}
    {options.length > 0 && <ul id={`${id}-listbox`} role="listbox" className="absolute left-0 right-0 top-full z-20 mt-2 max-h-72 overflow-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-xl dark:border-white/10 dark:bg-[#111827]">{options.map((option, index) => <li
      id={`${id}-option-${index}`}
      role="option"
      aria-selected={index === activeIndex}
      key={option.id}
      onMouseDown={(event) => { event.preventDefault(); choose(option); }}
      className={`cursor-pointer rounded-xl px-3 py-2.5 ${index === activeIndex ? "bg-indigo-50 dark:bg-indigo-500/10" : "hover:bg-slate-50 dark:hover:bg-white/5"}`}
    ><span className="block text-sm font-semibold text-slate-900 dark:text-white">{option.city} <span className="text-indigo-600 dark:text-indigo-400">{option.iataCode}</span></span><span className="text-xs text-slate-500">{option.name} · {option.countryCode}</span></li>)}</ul>}
  </div>;
}

function display(location: LocationOption): string {
  return `${location.city} (${location.iataCode})`;
}
