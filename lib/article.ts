import type { Article } from "@prisma/client";
import type { ArticleView, Intent, Keyword, Length, SeoMeta, Source, Step } from "@/lib/types";

function parseJson<T>(raw: string, fallback: T): T {
  try {
    const v = JSON.parse(raw) as T;
    return v ?? fallback;
  } catch {
    return fallback;
  }
}

export function toArticleView(a: Article): ArticleView {
  return {
    id: a.id,
    keyword: a.keyword,
    audience: a.audience,
    intent: a.intent as Intent,
    length: a.length as Length,
    step: a.step as Step,
    keywords: parseJson<Keyword[]>(a.keywordsJson, []),
    sources: parseJson<Source[]>(a.sourcesJson, []),
    paas: parseJson<string[]>(a.paasJson, []),
    related: parseJson<string[]>(a.relatedJson, []),
    researchNotes: a.researchNotes,
    outline: a.outline,
    draft: a.draft,
    wordCount: a.wordCount,
    meta: a.metaJson ? parseJson<SeoMeta | null>(a.metaJson, null) : null,
    createdAt: a.createdAt.toISOString(),
    updatedAt: a.updatedAt.toISOString(),
  };
}

export function primaryKeyword(a: Pick<Article, "keyword" | "keywordsJson">): string {
  const kws = parseJson<Keyword[]>(a.keywordsJson, []);
  return kws.find((k) => k.type === "primary")?.keyword ?? a.keyword;
}

export function isSeoMeta(x: unknown): x is SeoMeta {
  if (typeof x !== "object" || x === null) return false;
  const o = x as Record<string, unknown>;
  return (
    typeof o.metaTitle === "string" &&
    typeof o.metaDescription === "string" &&
    typeof o.urlSlug === "string" &&
    typeof o.focusKeyword === "string" &&
    Array.isArray(o.secondaryKeywords) &&
    ["Article", "HowTo", "FAQPage"].includes(String(o.schemaType))
  );
}

export function cleanSlug(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .split("-")
    .filter(Boolean)
    .slice(0, 7)
    .join("-");
}
