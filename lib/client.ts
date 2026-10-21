import type { ArticleView } from "@/lib/types";

/** Calls an article API route and returns the updated article, or throws a readable error. */
export async function apiArticle(url: string, init?: RequestInit): Promise<ArticleView> {
  const res = await fetch(url, { headers: { "Content-Type": "application/json" }, ...init });
  const data = (await res.json().catch(() => ({}))) as { article?: ArticleView; error?: string };
  if (!res.ok || !data.article) throw new Error(data.error ?? `Request failed (${res.status}).`);
  return data.article;
}

export function patchArticle(id: string, body: Record<string, unknown>): Promise<ArticleView> {
  return apiArticle(`/api/articles/${id}`, { method: "PATCH", body: JSON.stringify(body) });
}

export function downloadText(filename: string, text: string, mime = "text/plain") {
  const blob = new Blob([text], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
