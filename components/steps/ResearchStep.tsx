"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button, Card, ErrorBox, Spinner } from "@/components/ui";
import { apiArticle } from "@/lib/client";
import type { ArticleView } from "@/lib/types";

export function ResearchStep({
  article,
  onArticle,
  onNext,
  onBusy,
}: {
  article: ArticleView;
  onArticle: (a: ArticleView) => void;
  onNext: () => void;
  onBusy: (busy: boolean) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);

  const run = useCallback(async () => {
    setBusy(true);
    onBusy(true);
    setError(null);
    try {
      onArticle(await apiArticle(`/api/articles/${article.id}/research`, { method: "POST" }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Research failed.");
    } finally {
      setBusy(false);
      onBusy(false);
    }
  }, [article.id, onArticle, onBusy]);

  useEffect(() => {
    if (article.keywords.length === 0 && !started.current) {
      started.current = true;
      void run();
    }
  }, [article.keywords.length, run]);

  const primary = article.keywords.find((k) => k.type === "primary");
  const others = article.keywords.filter((k) => k.type !== "primary");

  if (busy) {
    return (
      <Card className="flex flex-col items-center py-14 text-center">
        <Spinner className="h-8 w-8" />
        <h2 className="mt-5 text-lg font-semibold text-slate-900">Researching “{article.keyword}”</h2>
        <p className="mt-2 max-w-md text-sm text-slate-600">
          Looking at what already ranks on Google, collecting questions people ask, finding sources with real numbers, and building your keyword map. Usually 15–40 seconds.
        </p>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <h2 className="mb-3 text-lg font-semibold text-slate-900">Step 2 · Research</h2>
        <ErrorBox message={error} onRetry={run} />
      </Card>
    );
  }

  if (article.keywords.length === 0) return null;

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Step 2 · Research</h2>
            <p className="mt-1 text-sm text-slate-600">Here is what the article will be built on. Nothing to fill in, just check it looks right.</p>
          </div>
          <Button variant="secondary" onClick={run}>Run again</Button>
        </div>
        {article.researchNotes && (
          <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">{article.researchNotes}</p>
        )}
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Focus keyword</h3>
          <p className="mt-2 text-xl font-semibold text-slate-900">{primary?.keyword ?? article.keyword}</p>
          <h3 className="mt-5 text-sm font-semibold uppercase tracking-wide text-slate-500">Supporting keywords</h3>
          <ul className="mt-2 flex flex-wrap gap-2">
            {others.map((k) => (
              <li
                key={k.keyword}
                title={`${k.type} · ${k.intent} · difficulty ${k.difficulty}`}
                className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-700"
              >
                {k.keyword}
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Questions people ask</h3>
          {article.paas.length ? (
            <ul className="mt-2 space-y-1.5 text-sm text-slate-800">
              {article.paas.slice(0, 8).map((q) => (
                <li key={q} className="flex gap-2">
                  <span className="text-indigo-500">?</span>
                  {q}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-slate-500">None found. The outline will use sensible FAQs instead.</p>
          )}
          {article.related.length > 0 && (
            <>
              <h3 className="mt-5 text-sm font-semibold uppercase tracking-wide text-slate-500">Related searches</h3>
              <p className="mt-2 text-sm text-slate-700">{article.related.slice(0, 8).join(" · ")}</p>
            </>
          )}
        </Card>
      </div>

      <Card>
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Sources the draft can cite ({article.sources.length})</h3>
        {article.sources.length ? (
          <ul className="mt-3 divide-y divide-slate-100">
            {article.sources.slice(0, 8).map((s) => (
              <li key={s.url} className="py-2.5">
                <a href={s.url} target="_blank" rel="noreferrer" className="text-sm font-medium text-indigo-700 hover:underline">
                  {s.title}
                </a>
                <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">{s.snippet}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-slate-500">No sources found. The draft will avoid specific statistics.</p>
        )}
      </Card>

      <div className="flex justify-end">
        <Button onClick={onNext}>Continue to outline →</Button>
      </div>
    </div>
  );
}
