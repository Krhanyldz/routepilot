import Link from "next/link";

export default function DiscoverPage() {
  return <main className="grid min-h-[70vh] place-items-center px-5 py-20 text-center">
    <section className="max-w-xl">
      <p className="text-sm font-semibold text-indigo-600">Worldwide search</p>
      <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950 dark:text-white">Choose your own destination.</h1>
      <p className="mt-4 leading-7 text-slate-600 dark:text-slate-300">RoutePilot no longer publishes hardcoded destination cards. Search the worldwide Travelpayouts city and airport catalog from the main page.</p>
      <Link href="/" className="mt-8 inline-flex rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white hover:bg-indigo-500">Search locations</Link>
    </section>
  </main>;
}
