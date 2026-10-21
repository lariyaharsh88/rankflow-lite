import type { Source } from "@/lib/types";

interface TavilyResponse {
  results?: Array<{ url?: string; title?: string; content?: string }>;
  answer?: string;
}

export async function tavilySearch(
  query: string,
  apiKey: string,
  depth: "basic" | "advanced" = "advanced",
): Promise<{ results: Source[]; answer: string }> {
  const res = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: apiKey,
      query,
      search_depth: depth,
      max_results: 8,
      include_answer: true,
      include_raw_content: false,
    }),
  });
  if (!res.ok) {
    if (res.status === 429) throw new Error("Tavily rate limit reached. Try again shortly.");
    throw new Error(`Tavily error ${res.status}: ${(await res.text()).slice(0, 200)}`);
  }
  const data = (await res.json()) as TavilyResponse;
  return {
    results: (data.results ?? [])
      .filter((r) => typeof r.url === "string" && r.url)
      .map((r) => ({
        url: r.url as string,
        title: r.title ?? (r.url as string),
        snippet: (r.content ?? "").slice(0, 600),
      })),
    answer: data.answer ?? "",
  };
}
