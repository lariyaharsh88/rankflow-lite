"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Markdown } from "@/components/Markdown";
import { Button, Card, ErrorBox, Spinner } from "@/components/ui";
import { apiArticle, patchArticle } from "@/lib/client";
import { countWords } from "@/lib/markdown";
import type { ArticleView } from "@/lib/types";

export function DraftStep({
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
  const [text, setText] = useState(article.draft);
  const [streaming, setStreaming] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);

  const stream = useCallback(async () => {
    setStreaming(true);
    onBusy(true);
    setEditing(false);
    setError(null);
    setText("");
    let acc = "";
    try {
      const res = await fetch(`/api/articles/${article.id}/draft`, { method: "POST" });
      if (!res.ok || !res.body) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? `Request failed (${res.status}).`);
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop() ?? "";
        for (const block of parts) {
          const line = block.trim();
          if (!line.startsWith("data:")) continue;
          let evt: { text?: string; done?: boolean; error?: string };
          try {
            evt = JSON.parse(line.slice(5).trim());
          } catch {
            continue;
          }
          if (evt.error) throw new Error(evt.error);
          if (evt.text) {
            acc += evt.text;
            setText(acc);
          }
        }
      }
      // Sync step/word count from the server once the stream is complete.
      onArticle(await apiArticle(`/api/articles/${article.id}`));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Draft failed.");
    } finally {
      setStreaming(false);
      onBusy(false);
    }
  }, [article.id, onArticle, onBusy]);

  // No abort on cleanup: StrictMode re-runs effects in dev, and the server keeps
  // saving the draft as it streams, so letting the request finish is the safe choice.
  useEffect(() => {
    if (!article.draft.trim() && !started.current) {
      started.current = true;
      void stream();
    }
  }, [article.draft, stream]);

  const saveEdits = async () => {
    setSaving(true);
    setError(null);
    try {
      onArticle(await patchArticle(article.id, { draft: text }));
      setEditing(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save.");
    } finally {
      setSaving(false);
    }
  };

  const continueNext = async () => {
    if (article.step === "draft") {
      try {
        onArticle(await patchArticle(article.id, { step: "seo" }));
      } catch {
        /* non-blocking */
      }
    }
    onNext();
  };

  const words = countWords(text);

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Step 4 · Draft</h2>
            <p className="mt-1 text-sm text-slate-600">
              {streaming
                ? "Writing now. You can watch it come in; it is saved as it goes."
                : "Read it through. Fix anything in Edit mode, or regenerate for a fresh take."}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {streaming ? (
              <span className="flex items-center gap-2 text-sm text-slate-600">
                <Spinner /> {words.toLocaleString()} words
              </span>
            ) : (
              <>
                <span className="text-sm text-slate-500">{words.toLocaleString()} words</span>
                {text && (
                  <Button variant="secondary" onClick={() => setEditing((v) => !v)}>
                    {editing ? "Preview" : "Edit text"}
                  </Button>
                )}
                <Button
                  variant="secondary"
                  onClick={() => {
                    if (!text || window.confirm("Replace the current draft with a new one?")) void stream();
                  }}
                >
                  {text ? "Regenerate" : "Write draft"}
                </Button>
              </>
            )}
          </div>
        </div>
        {error && <div className="mt-4"><ErrorBox message={error} onRetry={stream} /></div>}
      </Card>

      <Card className="min-h-[200px]">
        {editing ? (
          <>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={30}
              spellCheck
              className="w-full rounded-lg border border-slate-300 bg-slate-50 px-4 py-3 font-mono text-[13px] leading-6 text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-200"
            />
            <div className="mt-3 flex justify-end gap-2">
              <Button variant="secondary" onClick={() => { setText(article.draft); setEditing(false); }}>Cancel</Button>
              <Button onClick={saveEdits} disabled={saving}>{saving ? "Saving…" : "Save changes"}</Button>
            </div>
          </>
        ) : text ? (
          <Markdown source={text} streaming={streaming} />
        ) : (
          <div className="flex items-center justify-center gap-3 py-16 text-slate-500">
            <Spinner /> Starting the draft…
          </div>
        )}
      </Card>

      {!streaming && text && !editing && (
        <div className="flex justify-end">
          <Button onClick={continueNext}>Continue to SEO &amp; export →</Button>
        </div>
      )}
    </div>
  );
}
