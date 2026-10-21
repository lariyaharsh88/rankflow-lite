"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Field, inputClass } from "@/components/ui";
import { LENGTH_WORDS, type Intent, type Length } from "@/lib/types";

export function KeywordForm() {
  const router = useRouter();
  const [keyword, setKeyword] = useState("");
  const [audience, setAudience] = useState("");
  const [intent, setIntent] = useState<Intent>("informational");
  const [length, setLength] = useState<Length>("standard");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/articles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ keyword, audience, intent, length }),
    });
    const data = (await res.json().catch(() => ({}))) as { error?: string; article?: { id: string } };
    if (!res.ok || !data.article) {
      setError(data.error ?? "Could not start the article.");
      setBusy(false);
      return;
    }
    router.push(`/articles/${data.article.id}`);
  };

  return (
    <form onSubmit={submit} className="space-y-5">
      <Field label="Keyword you want to rank for" hint="One phrase, the way people type it into Google.">
        <input
          className={`${inputClass} text-base`}
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="e.g. how to start a vegetable garden"
          autoFocus
          required
          minLength={2}
          maxLength={120}
        />
      </Field>

      <Field label="Who is reading? (optional)" hint="Helps the writing match the reader. Leave blank for a general audience.">
        <input
          className={inputClass}
          value={audience}
          onChange={(e) => setAudience(e.target.value)}
          placeholder="e.g. first-time homeowners in India"
          maxLength={160}
        />
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="What does the reader want?">
          <select className={inputClass} value={intent} onChange={(e) => setIntent(e.target.value as Intent)}>
            <option value="informational">To learn something (informational)</option>
            <option value="commercial">To compare options (commercial)</option>
            <option value="transactional">To buy or sign up (transactional)</option>
          </select>
        </Field>
        <Field label="Article length">
          <select className={inputClass} value={length} onChange={(e) => setLength(e.target.value as Length)}>
            {(Object.keys(LENGTH_WORDS) as Length[]).map((l) => (
              <option key={l} value={l}>
                {l.charAt(0).toUpperCase() + l.slice(1)} · {LENGTH_WORDS[l]} words
              </option>
            ))}
          </select>
        </Field>
      </div>

      {error && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-slate-500">Next: we look at what already ranks and build your keyword map.</p>
        <Button type="submit" disabled={busy || keyword.trim().length < 2}>
          {busy ? "Starting…" : "Start research →"}
        </Button>
      </div>
    </form>
  );
}
