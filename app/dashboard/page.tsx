import Link from "next/link";
import { redirect } from "next/navigation";
import { Nav } from "@/components/Nav";
import { DeleteArticleButton } from "@/components/DeleteArticleButton";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { keyStatus } from "@/lib/providers/keys";
import { stepLabel } from "@/lib/steps";
import type { Step } from "@/lib/types";

export const metadata = { title: "Your articles" };
export const dynamic = "force-dynamic";

function timeAgo(d: Date): string {
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} h ago`;
  const days = Math.floor(h / 24);
  return days === 1 ? "yesterday" : `${days} days ago`;
}

function StepBadge({ step }: { step: Step }) {
  if (step === "done") {
    return <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">Done</span>;
  }
  return (
    <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700">
      Next: {stepLabel(step)}
    </span>
  );
}

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const articles = await db.article.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: "desc" },
    select: { id: true, keyword: true, step: true, wordCount: true, updatedAt: true },
  });
  const keys = keyStatus();

  return (
    <>
      <Nav />
      <main className="mx-auto max-w-5xl px-4 py-8">
        {!keys.gemini && (
          <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <strong>Setup needed:</strong> add <code className="rounded bg-amber-100 px-1">GEMINI_API_KEY</code> to{" "}
            <code className="rounded bg-amber-100 px-1">.env</code> and restart the server. Articles cannot be generated until then.
          </div>
        )}
        {keys.gemini && !keys.mock && (!keys.serper || !keys.tavily) && (
          <div className="mb-6 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
            Optional keys missing: {[!keys.serper && "SERPER_API_KEY (real Google results)", !keys.tavily && "TAVILY_API_KEY (research sources)"].filter(Boolean).join(", ")}. Articles still work, with less research.
          </div>
        )}
        {keys.mock && (
          <div className="mb-6 rounded-lg border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
            <strong>Demo mode.</strong> MOCK_PROVIDERS=1 is set, so research and drafts use canned sample data. Remove it and add your API keys for real output.
          </div>
        )}

        <div className="mb-6 flex items-end justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Your articles</h1>
            <p className="mt-1 text-sm text-slate-600">Pick up where you left off, or start a new one.</p>
          </div>
          <Link href="/new" className="rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700">
            New article
          </Link>
        </div>

        {articles.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
            <h2 className="text-lg font-semibold text-slate-900">No articles yet</h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-slate-600">
              Type the keyword you want to rank for. We research it, build an outline you approve, write the draft, and hand you the SEO package.
            </p>
            <Link href="/new" className="mt-5 inline-block rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700">
              Write your first article
            </Link>
          </div>
        ) : (
          <ul className="divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
            {articles.map((a) => (
              <li key={a.id} className="flex items-center gap-4 px-5 py-4">
                <div className="min-w-0 flex-1">
                  <Link href={`/articles/${a.id}`} className="block truncate font-medium text-slate-900 hover:text-indigo-700">
                    {a.keyword}
                  </Link>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    <StepBadge step={a.step as Step} />
                    {a.wordCount > 0 && <span>{a.wordCount.toLocaleString()} words</span>}
                    <span>Updated {timeAgo(a.updatedAt)}</span>
                  </div>
                </div>
                <Link
                  href={`/articles/${a.id}`}
                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-800 hover:bg-slate-50"
                >
                  {a.step === "done" ? "Open" : "Continue"}
                </Link>
                <DeleteArticleButton id={a.id} keyword={a.keyword} />
              </li>
            ))}
          </ul>
        )}
      </main>
    </>
  );
}
