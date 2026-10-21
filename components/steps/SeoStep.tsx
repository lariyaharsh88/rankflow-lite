"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button, Card, ErrorBox, Field, Spinner, inputClass } from "@/components/ui";
import { apiArticle, downloadText, patchArticle } from "@/lib/client";
import { markdownToHtmlDocument } from "@/lib/markdown";
import { computeSeoScore } from "@/lib/seo-score";
import type { ArticleView, SeoMeta } from "@/lib/types";

const EMPTY: SeoMeta = {
  metaTitle: "",
  metaDescription: "",
  urlSlug: "",
  focusKeyword: "",
  secondaryKeywords: [],
  schemaType: "Article",
};

function Counter({ n, max }: { n: number; max: number }) {
  const over = n > max;
  return <span className={`text-xs ${over ? "text-red-600" : "text-slate-400"}`}>{n}/{max}</span>;
}

export function SeoStep({
  article,
  onArticle,
  onBusy,
}: {
  article: ArticleView;
  onArticle: (a: ArticleView) => void;
  onBusy: (busy: boolean) => void;
}) {
  const [meta, setMeta] = useState<SeoMeta>(article.meta ?? EMPTY);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const started = useRef(false);

  const generate = useCallback(async () => {
    setGenerating(true);
    onBusy(true);
    setError(null);
    try {
      const a = await apiArticle(`/api/articles/${article.id}/seo`, { method: "POST" });
      onArticle(a);
      if (a.meta) setMeta(a.meta);
    } catch (e) {
      setError(e instanceof Error ? e.message : "SEO package failed.");
    } finally {
      setGenerating(false);
      onBusy(false);
    }
  }, [article.id, onArticle, onBusy]);

  useEffect(() => {
    if (!article.meta && article.draft.trim() && !started.current) {
      started.current = true;
      void generate();
    }
  }, [article.meta, article.draft, generate]);

  const score = useMemo(
    () => computeSeoScore(article.draft, meta.metaTitle ? meta : null, meta.focusKeyword || article.keyword),
    [article.draft, article.keyword, meta],
  );

  const say = (msg: string) => {
    setFlash(msg);
    setTimeout(() => setFlash(null), 1800);
  };

  const save = async (markDone = false) => {
    setSaving(true);
    setError(null);
    try {
      const body: Record<string, unknown> = { meta };
      if (markDone) body.step = "done";
      onArticle(await patchArticle(article.id, body));
      say(markDone ? "Marked as done" : "Saved");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save.");
    } finally {
      setSaving(false);
    }
  };

  const fileBase = meta.urlSlug || "article";
  const html = () => markdownToHtmlDocument(article.draft, meta.metaTitle, meta.metaDescription);
  const copy = async (text: string, label: string) => {
    await navigator.clipboard.writeText(text);
    say(`${label} copied`);
  };

  if (!article.draft.trim()) {
    return (
      <Card>
        <h2 className="text-lg font-semibold text-slate-900">Step 5 · SEO &amp; export</h2>
        <p className="mt-2 text-sm text-slate-600">Write the draft first.</p>
      </Card>
    );
  }

  if (generating) {
    return (
      <Card className="flex flex-col items-center py-14 text-center">
        <Spinner className="h-8 w-8" />
        <h2 className="mt-5 text-lg font-semibold text-slate-900">Preparing the SEO package</h2>
        <p className="mt-2 max-w-md text-sm text-slate-600">Title, description, URL slug and keyword fields from your draft.</p>
      </Card>
    );
  }

  const ring = score.overall >= 80 ? "text-emerald-600" : score.overall >= 50 ? "text-amber-600" : "text-red-600";

  return (
    <div className="space-y-4">
      {article.step === "done" && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          This article is done. Export it below, or <Link href="/new" className="underline">start the next one</Link>.
        </div>
      )}
      {error && <ErrorBox message={error} onRetry={generate} />}

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <Card>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Step 5 · SEO &amp; export</h2>
              <p className="mt-1 text-sm text-slate-600">These go into your CMS. Edit freely; the score updates as you type.</p>
            </div>
            <Button variant="secondary" onClick={generate}>Suggest again</Button>
          </div>

          <div className="mt-5 space-y-4">
            <Field label="Title tag">
              <input className={inputClass} value={meta.metaTitle} onChange={(e) => setMeta({ ...meta, metaTitle: e.target.value })} />
              <div className="mt-1 flex justify-end"><Counter n={meta.metaTitle.length} max={60} /></div>
            </Field>
            <Field label="Meta description">
              <textarea
                className={inputClass}
                rows={3}
                value={meta.metaDescription}
                onChange={(e) => setMeta({ ...meta, metaDescription: e.target.value })}
              />
              <div className="mt-1 flex justify-end"><Counter n={meta.metaDescription.length} max={155} /></div>
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="URL slug">
                <input className={`${inputClass} font-mono`} value={meta.urlSlug} onChange={(e) => setMeta({ ...meta, urlSlug: e.target.value })} />
              </Field>
              <Field label="Focus keyword">
                <input className={inputClass} value={meta.focusKeyword} onChange={(e) => setMeta({ ...meta, focusKeyword: e.target.value })} />
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Secondary keywords" hint="Comma-separated.">
                <input
                  className={inputClass}
                  value={meta.secondaryKeywords.join(", ")}
                  onChange={(e) =>
                    setMeta({ ...meta, secondaryKeywords: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })
                  }
                />
              </Field>
              <Field label="Schema type">
                <select
                  className={inputClass}
                  value={meta.schemaType}
                  onChange={(e) => setMeta({ ...meta, schemaType: e.target.value as SeoMeta["schemaType"] })}
                >
                  <option value="Article">Article</option>
                  <option value="HowTo">HowTo</option>
                  <option value="FAQPage">FAQPage</option>
                </select>
              </Field>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-5">
            <span className="text-sm text-emerald-700">{flash}</span>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => save(false)} disabled={saving}>Save</Button>
              {article.step !== "done" && (
                <Button onClick={() => save(true)} disabled={saving}>Save &amp; mark done</Button>
              )}
            </div>
          </div>
        </Card>

        <div className="space-y-4">
          <Card>
            <div className="flex items-center gap-4">
              <div className={`grid h-16 w-16 shrink-0 place-items-center rounded-full border-4 ${ring} border-current text-xl font-bold`}>
                {score.overall}
              </div>
              <div>
                <h3 className="font-semibold text-slate-900">SEO score</h3>
                <p className="text-xs text-slate-500">{score.wordCount.toLocaleString()} words · on-page checks only</p>
              </div>
            </div>
            <ul className="mt-4 space-y-3">
              {score.aspects.map((a) => (
                <li key={a.id}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-800">{a.label}</span>
                    <span className={a.status === "good" ? "text-emerald-600" : a.status === "ok" ? "text-amber-600" : "text-red-600"}>
                      {a.score}
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`h-full rounded-full ${a.status === "good" ? "bg-emerald-500" : a.status === "ok" ? "bg-amber-500" : "bg-red-500"}`}
                      style={{ width: `${a.score}%` }}
                    />
                  </div>
                  {a.tips.length > 0 && <p className="mt-1 text-xs text-slate-500">{a.tips[0]}</p>}
                </li>
              ))}
            </ul>
          </Card>

          <Card>
            <h3 className="font-semibold text-slate-900">Export</h3>
            <p className="mt-1 text-xs text-slate-500">Paste into WordPress, Ghost, Webflow, Notion, or Google Docs.</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Button variant="secondary" onClick={() => copy(article.draft, "Markdown")}>Copy Markdown</Button>
              <Button variant="secondary" onClick={() => copy(html(), "HTML")}>Copy HTML</Button>
              <Button variant="secondary" onClick={() => downloadText(`${fileBase}.md`, article.draft, "text/markdown")}>Download .md</Button>
              <Button variant="secondary" onClick={() => downloadText(`${fileBase}.html`, html(), "text/html")}>Download .html</Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
