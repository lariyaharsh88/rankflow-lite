import Link from "next/link";
import { redirect } from "next/navigation";
import { Nav } from "@/components/Nav";
import { getCurrentUser } from "@/lib/auth";
import { STEPS } from "@/lib/steps";

export default async function HomePage() {
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");

  return (
    <>
      <Nav />
      <main className="mx-auto max-w-5xl px-4">
        <section className="py-16 text-center sm:py-24">
          <p className="mb-3 text-sm font-medium uppercase tracking-wide text-indigo-600">Keyword → article → publish</p>
          <h1 className="mx-auto max-w-2xl text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
            One keyword in. A publish-ready SEO article out.
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-lg text-slate-600">
            Five clear steps. You review each one before the next starts. No dashboards to learn, no settings to tune.
          </p>
          <div className="mt-8 flex justify-center gap-3">
            <Link href="/signup" className="rounded-lg bg-indigo-600 px-5 py-3 font-medium text-white hover:bg-indigo-700">
              Create free account
            </Link>
            <Link href="/login" className="rounded-lg border border-slate-300 bg-white px-5 py-3 font-medium text-slate-800 hover:bg-slate-50">
              Sign in
            </Link>
          </div>
        </section>

        <section className="pb-20">
          <ol className="grid gap-4 sm:grid-cols-5">
            {STEPS.map((s) => (
              <li key={s.id} className="rounded-xl border border-slate-200 bg-white p-4">
                <span className="grid h-7 w-7 place-items-center rounded-full bg-indigo-600 text-xs font-bold text-white">{s.n}</span>
                <h2 className="mt-3 font-semibold text-slate-900">{s.label}</h2>
                <p className="mt-1 text-sm text-slate-600">{s.hint}</p>
              </li>
            ))}
          </ol>
          <p className="mt-6 text-center text-sm text-slate-500">
            Every article is saved as you go. Close the tab, come back later, continue where you left off.
          </p>
        </section>
      </main>
    </>
  );
}
