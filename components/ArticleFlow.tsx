"use client";

import Link from "next/link";
import { useState } from "react";
import { Stepper } from "@/components/Stepper";
import { Button, Card } from "@/components/ui";
import { ResearchStep } from "@/components/steps/ResearchStep";
import { OutlineStep } from "@/components/steps/OutlineStep";
import { DraftStep } from "@/components/steps/DraftStep";
import { SeoStep } from "@/components/steps/SeoStep";
import { nextStep } from "@/lib/steps";
import { LENGTH_WORDS, type ArticleView, type Step } from "@/lib/types";

type Id = Step | "keyword";

export function ArticleFlow({ initial, geminiReady }: { initial: ArticleView; geminiReady: boolean }) {
  const [article, setArticle] = useState<ArticleView>(initial);
  const [active, setActive] = useState<Id>(initial.step === "done" ? "seo" : initial.step);
  // While a step is generating, the stepper is locked so a running request is never orphaned.
  const [busy, setBusy] = useState(false);

  const goNext = (from: Step) => {
    const n = nextStep(from);
    setActive(n === "done" ? "seo" : n);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <Link href="/dashboard" className="text-xs text-slate-500 hover:text-slate-800">
            ← All articles
          </Link>
          <h1 className="mt-1 truncate text-2xl font-bold text-slate-900">{article.keyword}</h1>
          <p className="mt-1 text-sm text-slate-500">
            {article.audience || "General audience"} · {article.intent} · {LENGTH_WORDS[article.length]} words
            {article.step === "done" && <span className="ml-2 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">Done</span>}
          </p>
        </div>
      </div>

      <Stepper current={active} reached={article.step} onSelect={setActive} locked={busy} />

      {!geminiReady && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <strong>GEMINI_API_KEY is not set.</strong> Add it to <code>.env</code> and restart the server, then come back to this page.
        </div>
      )}

      {active === "keyword" && (
        <Card>
          <h2 className="text-lg font-semibold text-slate-900">Step 1 · Keyword</h2>
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-slate-500">Keyword</dt>
              <dd className="font-medium text-slate-900">{article.keyword}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Audience</dt>
              <dd className="font-medium text-slate-900">{article.audience || "General readers"}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Intent</dt>
              <dd className="font-medium text-slate-900">{article.intent}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Length</dt>
              <dd className="font-medium text-slate-900">{LENGTH_WORDS[article.length]} words</dd>
            </div>
          </dl>
          <p className="mt-4 text-xs text-slate-500">
            The brief is fixed once research starts. To use a different keyword, <Link href="/new" className="underline">start a new article</Link>.
          </p>
          <div className="mt-5 flex justify-end">
            <Button onClick={() => setActive("research")}>Continue to research →</Button>
          </div>
        </Card>
      )}

      {active === "research" && (
        <ResearchStep article={article} onArticle={setArticle} onNext={() => goNext("research")} onBusy={setBusy} />
      )}
      {active === "outline" && (
        <OutlineStep article={article} onArticle={setArticle} onNext={() => goNext("outline")} onBusy={setBusy} />
      )}
      {active === "draft" && (
        <DraftStep article={article} onArticle={setArticle} onNext={() => goNext("draft")} onBusy={setBusy} />
      )}
      {active === "seo" && <SeoStep article={article} onArticle={setArticle} onBusy={setBusy} />}
    </div>
  );
}
