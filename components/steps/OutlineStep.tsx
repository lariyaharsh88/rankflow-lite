"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button, Card, ErrorBox, Spinner } from "@/components/ui";
import { apiArticle, patchArticle } from "@/lib/client";
import type { ArticleView } from "@/lib/types";

export function OutlineStep({
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
  const [text, setText] = useState(article.outline);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);

  const generate = useCallback(async () => {
    setGenerating(true);
    onBusy(true);
    setError(null);
    try {
      const a = await apiArticle(`/api/articles/${article.id}/outline`, { method: "POST" });
      onArticle(a);
      setText(a.outline);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Outline failed.");
    } finally {
      setGenerating(false);
      onBusy(false);
    }
  }, [article.id, onArticle, onBusy]);

  useEffect(() => {
    if (!article.outline.trim() && !started.current) {
      started.current = true;
      void generate();
    }
  }, [article.outline, generate]);

  const approve = async () => {
    setSaving(true);
    setError(null);
    try {
      const body: Record<string, unknown> = { outline: text };
      if (article.step === "outline") body.step = "draft";
      onArticle(await patchArticle(article.id, body));
      onNext();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save.");
    } finally {
      setSaving(false);
    }
  };

  const h2 = (text.match(/^##\s+/gm) ?? []).length;
  const h3 = (text.match(/^###\s+/gm) ?? []).length;
  const dirty = text !== article.outline;

  if (generating) {
    return (
      <Card className="flex flex-col items-center py-14 text-center">
        <Spinner className="h-8 w-8" />
        <h2 className="mt-5 text-lg font-semibold text-slate-900">Building the outline</h2>
        <p className="mt-2 max-w-md text-sm text-slate-600">Turning the research into headings and FAQs. About 10–20 seconds.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Step 3 · Outline</h2>
            <p className="mt-1 text-sm text-slate-600">
              Edit anything you like: rename headings, delete sections, add your own. The draft follows this exactly.
            </p>
          </div>
          <Button variant="secondary" onClick={generate}>Regenerate</Button>
        </div>
        {error && <div className="mt-4"><ErrorBox message={error} onRetry={generate} /></div>}
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={Math.min(40, Math.max(14, text.split("\n").length + 2))}
          spellCheck={false}
          className="mt-4 w-full rounded-lg border border-slate-300 bg-slate-50 px-4 py-3 font-mono text-[13px] leading-6 text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-200"
        />
        <p className="mt-2 text-xs text-slate-500">
          {h2} sections · {h3} subheadings. Lines starting with # are the title, ## sections, ### subheadings.
          {article.draft && dirty && " A draft already exists; regenerate it in the next step to apply these changes."}
        </p>
      </Card>
      <div className="flex justify-end">
        <Button onClick={approve} disabled={saving || !text.trim()}>
          {saving ? "Saving…" : article.draft ? "Save outline →" : "Looks good, write the draft →"}
        </Button>
      </div>
    </div>
  );
}
