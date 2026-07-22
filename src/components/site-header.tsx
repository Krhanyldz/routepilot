"use client";

import Link from "next/link";
import { useState } from "react";
import { MoonIcon, SunIcon } from "./icons";

export function SiteHeader() {
  const [dark, setDark] = useState(false);
  const toggleTheme = (): void => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
  };

  return <header className="sticky top-0 z-50 border-b border-slate-200/70 bg-white/80 backdrop-blur-xl dark:border-white/10 dark:bg-[#080d18]/80">
    <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 sm:px-8">
      <Link href="/" className="flex items-center gap-2.5 font-semibold tracking-tight"><span className="grid size-8 place-items-center rounded-xl bg-indigo-600 text-sm font-bold text-white shadow-lg shadow-indigo-600/20">R</span><span>RoutePilot</span></Link>
      <nav className="flex items-center gap-1 text-sm font-medium"><Link href="/" className="hidden rounded-lg px-3 py-2 text-slate-600 transition hover:bg-slate-100 hover:text-slate-950 sm:block dark:text-slate-300 dark:hover:bg-white/8 dark:hover:text-white">Search</Link><Link href="/discover" className="rounded-lg px-3 py-2 text-slate-600 transition hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-white/8 dark:hover:text-white">Discover</Link><button type="button" onClick={toggleTheme} aria-label="Toggle dark mode" className="ml-2 grid size-9 place-items-center rounded-full border border-slate-200 text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 dark:border-white/12 dark:text-slate-300 dark:hover:bg-white/8">{dark ? <SunIcon className="size-4" /> : <MoonIcon className="size-4" />}</button></nav>
    </div>
  </header>;
}
