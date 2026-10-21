import type { Article } from "@prisma/client";
import { geminiJSON } from "@/lib/providers/gemini";
import { geminiKey, isMock } from "@/lib/providers/keys";
import { mockMeta } from "@/lib/providers/mock";
import { cleanSlug, isSeoMeta, primaryKeyword } from "@/lib/article";
import { extractH1 } from "@/lib/markdown";
import type { SeoMeta } from "@/lib/types";

export function defaultMeta(article: Article): SeoMeta {
  const focus = primaryKeyword(article);
  const h1 = extractH1(article.draft) || article.keyword;
  return {
    metaTitle: h1.slice(0, 60),
    metaDescription: `Learn about ${focus}: what it is, how it works, and practical steps you can take today.`.slice(0, 155),
    urlSlug: cleanSlug(focus) || "article",
    focusKeyword: focus,
    secondaryKeywords: [],
    schemaType: "Article",
  };
}

export function sanitizeMeta(m: SeoMeta): SeoMeta {
  return {
    ...m,
    metaTitle: m.metaTitle.trim().slice(0, 60),
    metaDescription: m.metaDescription.trim().slice(0, 155),
    urlSlug: cleanSlug(m.urlSlug) || "article",
    focusKeyword: m.focusKeyword.trim(),
    secondaryKeywords: m.secondaryKeywords.map((s) => String(s).trim()).filter(Boolean).slice(0, 8),
  };
}

export async function generateSeoMeta(article: Article): Promise<SeoMeta> {
  if (isMock()) return sanitizeMeta(mockMeta(article.keyword));

  const focus = primaryKeyword(article);
  const prompt = `You are an SEO technical editor. From the article below, output JSON matching this schema exactly:

{
  "metaTitle": "max 60 characters, includes the focus keyword, specific and honest",
  "metaDescription": "120-155 characters, includes the focus keyword, says what the reader gets",
  "urlSlug": "hyphenated lowercase slug, max 6 words",
  "focusKeyword": "string",
  "secondaryKeywords": ["up to 8 strings"],
  "schemaType": "Article" | "HowTo" | "FAQPage"
}

Topic: ${article.keyword}
Focus keyword hint: ${focus}

ARTICLE:
${article.draft.slice(0, 12_000)}

JSON only. No markdown.`;

  try {
    const parsed = await geminiJSON<unknown>(prompt, geminiKey(), { temperature: 0.3 });
    if (isSeoMeta(parsed)) return sanitizeMeta(parsed);
  } catch {
    /* fall through */
  }
  return defaultMeta(article);
}
