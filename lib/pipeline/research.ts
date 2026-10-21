import type { Article } from "@prisma/client";
import { geminiJSON } from "@/lib/providers/gemini";
import { serperSearch, serpToContext, type SerpSnapshot } from "@/lib/providers/serper";
import { tavilySearch } from "@/lib/providers/tavily";
import { geminiKey, isMock, serperKey, tavilyKey } from "@/lib/providers/keys";
import { mockKeywords, mockSerp, mockSources } from "@/lib/providers/mock";
import type { Keyword, Source } from "@/lib/types";

export interface ResearchResult {
  keywords: Keyword[];
  sources: Source[];
  paas: string[];
  related: string[];
  researchContext: string;
  serpContext: string;
  /** Human-readable notes about what was skipped (missing optional keys etc.). */
  notes: string;
}

const TYPES = ["primary", "secondary", "longtail"] as const;
const INTENTS = ["informational", "commercial", "transactional"] as const;
const DIFFS = ["low", "medium", "high"] as const;

function normalizeKeywords(raw: unknown, fallback: string): Keyword[] {
  const out: Keyword[] = [];
  if (Array.isArray(raw)) {
    for (const item of raw) {
      if (typeof item !== "object" || item === null) continue;
      const r = item as Record<string, unknown>;
      const keyword = typeof r.keyword === "string" ? r.keyword.trim() : "";
      if (!keyword) continue;
      const t = String(r.type ?? "").toLowerCase();
      const type = (TYPES as readonly string[]).includes(t)
        ? (t as Keyword["type"])
        : /long/.test(t) ? "longtail" : "secondary";
      const i = String(r.intent ?? "").toLowerCase();
      const intent = (INTENTS as readonly string[]).includes(i) ? (i as Keyword["intent"]) : "informational";
      const d = String(r.difficulty ?? "").toLowerCase();
      const difficulty = (DIFFS as readonly string[]).includes(d) ? (d as Keyword["difficulty"]) : "medium";
      out.push({ keyword, type, intent, difficulty });
    }
  }
  if (!out.some((k) => k.type === "primary")) {
    out.unshift({ keyword: fallback, type: "primary", intent: "informational", difficulty: "medium" });
  }
  // Only one primary.
  let seenPrimary = false;
  return out
    .map((k) => {
      if (k.type !== "primary") return k;
      if (seenPrimary) return { ...k, type: "secondary" as const };
      seenPrimary = true;
      return k;
    })
    .slice(0, 20);
}

export async function runResearch(article: Article): Promise<ResearchResult> {
  const keyword = article.keyword.trim();
  const notes: string[] = [];

  if (isMock()) {
    const serp = mockSerp(keyword);
    const sources = mockSources(keyword);
    return {
      keywords: mockKeywords(keyword),
      sources,
      paas: serp.paas,
      related: serp.related,
      researchContext: sources.map((s) => `TITLE: ${s.title}\nURL: ${s.url}\nSNIPPET: ${s.snippet}\n---`).join("\n"),
      serpContext: serpToContext(serp),
      notes: "Demo mode: canned research data (MOCK_PROVIDERS=1).",
    };
  }

  const gKey = geminiKey();
  const sKey = serperKey();
  const tKey = tavilyKey();

  // Google results + web sources in parallel. Both optional; keyword map only needs Gemini.
  const [serpRes, tavilyRes] = await Promise.allSettled([
    sKey ? serperSearch(keyword, sKey) : Promise.reject(new Error("no-serper")),
    tKey
      ? Promise.all([
          tavilySearch(keyword, tKey, "advanced"),
          tavilySearch(`${keyword} statistics data 2025 2026`, tKey, "advanced"),
        ])
      : Promise.reject(new Error("no-tavily")),
  ]);

  let serp: SerpSnapshot = { organic: [], paas: [], related: [], featured: null };
  if (serpRes.status === "fulfilled") serp = serpRes.value;
  else if (!sKey) notes.push("Google results skipped: SERPER_API_KEY not set.");
  else notes.push(`Google results failed: ${serpRes.reason instanceof Error ? serpRes.reason.message : "error"}`);

  const sourceMap = new Map<string, Source>();
  if (tavilyRes.status === "fulfilled") {
    for (const batch of tavilyRes.value) {
      for (const s of batch.results) if (!sourceMap.has(s.url)) sourceMap.set(s.url, s);
    }
  } else if (!tKey) notes.push("Web sources skipped: TAVILY_API_KEY not set.");
  else notes.push(`Web sources failed: ${tavilyRes.reason instanceof Error ? tavilyRes.reason.message : "error"}`);

  // If Tavily is missing, fall back to organic snippets as sources so the draft still has something to cite.
  if (sourceMap.size === 0) {
    for (const o of serp.organic) if (o.link) sourceMap.set(o.link, { url: o.link, title: o.title, snippet: o.snippet });
  }
  const sources = Array.from(sourceMap.values()).slice(0, 16);

  const prompt = `You are an SEO keyword strategist. Build a keyword map for one article.

Main keyword: ${keyword}
Search intent: ${article.intent}
Audience: ${article.audience || "general readers"}

Google related searches:
${serp.related.join("\n") || "(none)"}

People also ask:
${serp.paas.join("\n") || "(none)"}

Return JSON only, shape:
{"keywords":[{"keyword":"string","type":"primary"|"secondary"|"longtail","intent":"informational"|"commercial"|"transactional","difficulty":"low"|"medium"|"high"}]}

Rules:
- Exactly one "primary": the main keyword or a closer match to what people actually search.
- 5–7 "secondary" and 5–7 "longtail". Lowercase. No duplicates. Use real searcher phrasing from the lists above where sensible.`;

  let keywords: Keyword[];
  try {
    const parsed = await geminiJSON<{ keywords?: unknown }>(prompt, gKey, { temperature: 0.3 });
    keywords = normalizeKeywords(parsed.keywords, keyword);
  } catch (e) {
    notes.push(`Keyword map fell back to basics: ${e instanceof Error ? e.message : "error"}`);
    keywords = normalizeKeywords([], keyword).concat([
      { keyword: `${keyword} guide`, type: "secondary", intent: "informational", difficulty: "medium" },
      { keyword: `how to ${keyword}`, type: "longtail", intent: "informational", difficulty: "low" },
    ]);
  }

  return {
    keywords,
    sources,
    paas: serp.paas,
    related: serp.related,
    researchContext: sources.map((s) => `TITLE: ${s.title}\nURL: ${s.url}\nSNIPPET: ${s.snippet}\n---`).join("\n"),
    serpContext: serpToContext(serp),
    notes: notes.join(" "),
  };
}
