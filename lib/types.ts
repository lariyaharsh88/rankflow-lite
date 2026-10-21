export type Intent = "informational" | "commercial" | "transactional";
export type Length = "short" | "standard" | "long";
export type Step = "research" | "outline" | "draft" | "seo" | "done";

export interface Keyword {
  keyword: string;
  type: "primary" | "secondary" | "longtail";
  intent: Intent;
  difficulty: "low" | "medium" | "high";
}

export interface Source {
  url: string;
  title: string;
  snippet: string;
}

export interface SeoMeta {
  metaTitle: string;
  metaDescription: string;
  urlSlug: string;
  focusKeyword: string;
  secondaryKeywords: string[];
  schemaType: "Article" | "HowTo" | "FAQPage";
}

/** Article as the client sees it (JSON columns already parsed). */
export interface ArticleView {
  id: string;
  keyword: string;
  audience: string;
  intent: Intent;
  length: Length;
  step: Step;
  keywords: Keyword[];
  sources: Source[];
  paas: string[];
  related: string[];
  researchNotes: string;
  outline: string;
  draft: string;
  wordCount: number;
  meta: SeoMeta | null;
  createdAt: string;
  updatedAt: string;
}

export const LENGTH_WORDS: Record<Length, string> = {
  short: "800–1,100",
  standard: "1,500–2,000",
  long: "2,500–3,000",
};
