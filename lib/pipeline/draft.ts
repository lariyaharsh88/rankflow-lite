import type { Article } from "@prisma/client";
import { geminiStream } from "@/lib/providers/gemini";
import { geminiKey, isMock } from "@/lib/providers/keys";
import { mockDraftStream } from "@/lib/providers/mock";
import { primaryKeyword } from "@/lib/article";
import { LENGTH_WORDS, type Keyword, type Length } from "@/lib/types";

const cap = (s: string, n: number) => (s.length > n ? `${s.slice(0, n)}\n…(truncated)` : s);

export async function streamDraft(article: Article, onChunk: (t: string) => void): Promise<string> {
  if (isMock()) return mockDraftStream(article.keyword, article.outline, onChunk);

  const keywords = JSON.parse(article.keywordsJson || "[]") as Keyword[];
  const paas = JSON.parse(article.paasJson || "[]") as string[];
  const primary = primaryKeyword(article);
  const words = LENGTH_WORDS[(article.length as Length) || "standard"];
  const audience = article.audience || "general readers";

  const prompt = `You are a senior SEO content writer. You write clear, useful articles that rank on Google page 1 and that real people finish reading. You back claims with data and cite sources.

Write a COMPLETE ${words}-word SEO article in markdown.

TOPIC: ${article.keyword}
PRIMARY KEYWORD: ${primary}
SUPPORTING KEYWORDS (use naturally, never stuffed): ${keywords.map((k) => k.keyword).join(", ")}
TARGET AUDIENCE: ${audience}
SEARCH INTENT: ${article.intent}

OUTLINE TO FOLLOW EXACTLY (same H1/H2/H3 text and order):
${cap(article.outline, 10_000)}

RESEARCH FACTS AND SOURCES (use real numbers from here; cite inline as [Source: domain.com]):
${cap(article.researchContext || "(no sources provided — avoid specific statistics)", 12_000)}

PEOPLE ALSO ASK (answer these in the FAQ):
${paas.slice(0, 10).join("\n") || "(derive from topic)"}

WRITING RULES:
1. Start with the H1. Primary keyword in the H1, in the first 100 words, and in at least one H2.
2. Intro: 2 short paragraphs (90–130 words total). Say who this is for and what they will be able to do after reading.
3. Follow every H2 and H3 from the outline. Write substantial, specific paragraphs. No filler.
4. Plain English, about Grade 8 readability. Mix short sentences (5–12 words) with some longer ones (max ~28). Explain any technical term the first time.
5. Include at least 3 concrete examples or mini scenarios that fit the audience.
6. Include at least 2 markdown tables (one comparison, one checklist/steps/numbers) with a one-line caption above each.
7. Use bullet or numbered lists where they help scanning.
8. Cite statistics inline as [Source: domain.com]. Never invent numbers; if research has none, say "varies" instead of guessing.
9. FAQ: 5 questions as "### " headings with 2–4 sentence answers.
10. Conclusion: 3 key takeaways and one clear next step.
11. End with a "## Sources" section: bullet list of the source pages you used as markdown links.
12. Banned phrases: "In today's fast-paced world", "It's no secret", "delve", "landscape", "robust", "leverage", "game-changer", "unlock", "cutting-edge". Do not stack "Furthermore/Moreover/Additionally".
13. Do not truncate. Write every section in full.

Write the complete article now:`;

  const maxOutputTokens = article.length === "long" ? 12_288 : 8_192;
  return geminiStream(prompt, geminiKey(), onChunk, { temperature: 0.7, maxOutputTokens });
}
