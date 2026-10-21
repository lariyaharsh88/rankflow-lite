export interface SerpSnapshot {
  organic: Array<{ title: string; link: string; snippet: string }>;
  paas: string[];
  related: string[];
  featured: { title?: string; url?: string; text: string } | null;
}

interface SerperResponse {
  organic?: Array<{ title?: string; link?: string; snippet?: string }>;
  peopleAlsoAsk?: Array<{ question?: string }>;
  relatedSearches?: Array<{ query?: string }>;
  answerBox?: { title?: string; link?: string; snippet?: string; answer?: string };
}

export async function serperSearch(query: string, apiKey: string): Promise<SerpSnapshot> {
  const res = await fetch("https://google.serper.dev/search", {
    method: "POST",
    headers: { "X-API-KEY": apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({ q: query, num: 10 }),
  });
  if (!res.ok) {
    if (res.status === 429) throw new Error("Serper rate limit reached. Try again in a minute.");
    throw new Error(`Serper error ${res.status}: ${(await res.text()).slice(0, 200)}`);
  }
  const data = (await res.json()) as SerperResponse;
  const box = data.answerBox;
  const featuredText = [box?.answer, box?.snippet].filter(Boolean).join("\n\n").trim();
  return {
    organic: (data.organic ?? []).slice(0, 8).map((o) => ({
      title: o.title ?? "Result",
      link: o.link ?? "",
      snippet: o.snippet ?? "",
    })),
    paas: (data.peopleAlsoAsk ?? [])
      .map((p) => p.question?.trim() ?? "")
      .filter(Boolean),
    related: (data.relatedSearches ?? [])
      .map((r) => r.query?.trim() ?? "")
      .filter(Boolean),
    featured: featuredText ? { title: box?.title, url: box?.link, text: featuredText } : null,
  };
}

export function serpToContext(s: SerpSnapshot): string {
  let out = s.organic
    .map((o, i) => `${i + 1}. ${o.title}\n   ${o.link}\n   ${o.snippet}`)
    .join("\n\n");
  if (s.featured) {
    out += `\n\n---\nFEATURED SNIPPET\n${s.featured.title ? `Title: ${s.featured.title}\n` : ""}${s.featured.text}`;
  }
  return out;
}
