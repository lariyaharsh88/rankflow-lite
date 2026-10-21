import type { Article } from "@prisma/client";
import { geminiStream } from "@/lib/providers/gemini";
import { geminiKey, isMock } from "@/lib/providers/keys";
import { mockOutline } from "@/lib/providers/mock";
import { primaryKeyword } from "@/lib/article";
import type { Keyword } from "@/lib/types";

const cap = (s: string, n: number) => (s.length > n ? `${s.slice(0, n)}\n…(truncated)` : s);

export async function generateOutline(article: Article): Promise<string> {
  if (isMock()) return mockOutline(article.keyword);

  const keywords = JSON.parse(article.keywordsJson || "[]") as Keyword[];
  const paas = JSON.parse(article.paasJson || "[]") as string[];
  const related = JSON.parse(article.relatedJson || "[]") as string[];
  const primary = primaryKeyword(article);
  const sectionCount = article.length === "short" ? "4" : article.length === "long" ? "6-7" : "5-6";

  const prompt = `Create a detailed article OUTLINE in markdown for an SEO article.

TOPIC / MAIN KEYWORD: ${article.keyword}
PRIMARY KEYWORD (must appear in the H1): ${primary}
SUPPORTING KEYWORDS (weave into headings where natural): ${keywords.filter((k) => k.type !== "primary").map((k) => k.keyword).join(", ") || "(none)"}
TARGET AUDIENCE: ${article.audience || "general readers"}
SEARCH INTENT: ${article.intent}

RESEARCH SOURCES:
${cap(article.researchContext || "(none)", 10_000)}

TOP GOOGLE RESULTS (what already ranks — cover what they cover, then add something better):
${cap(article.serpContext || "(none)", 8_000)}

RELATED SEARCHES:
${related.slice(0, 15).join("\n") || "(none)"}

PEOPLE ALSO ASK:
${paas.slice(0, 12).join("\n") || "(none — write sensible FAQs)"}

STRICT STRUCTURE:
- One H1 line starting with "# " containing the primary keyword. Make it specific and useful, not clickbait.
- ${sectionCount} H2 sections as "## ". Put keywords in several headings where it reads naturally.
- Under EACH H2, 2-3 H3 subheads as "### ".
- A "## FAQ" section with 5 questions as "### " lines, taken from People Also Ask where available.
- A final "## Conclusion".

Output ONLY the markdown outline. No preamble, no commentary.`;

  let out = "";
  await geminiStream(prompt, geminiKey(), (c) => (out += c), { temperature: 0.5 });
  return out.trim().replace(/^```(?:markdown)?\s*|```\s*$/g, "");
}
