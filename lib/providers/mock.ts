/**
 * Canned provider output so the whole flow runs with MOCK_PROVIDERS=1 and no keys.
 * Used for demos and UI work. Never used when real keys are configured.
 */
import type { Keyword, SeoMeta, Source } from "@/lib/types";
import type { SerpSnapshot } from "@/lib/providers/serper";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function mockSerp(keyword: string): SerpSnapshot {
  return {
    organic: [1, 2, 3, 4, 5].map((i) => ({
      title: `${keyword} — guide #${i}`,
      link: `https://example.com/${keyword.replace(/\s+/g, "-")}-${i}`,
      snippet: `A competing page about ${keyword}. Covers basics, costs and common mistakes.`,
    })),
    paas: [
      `What is ${keyword}?`,
      `How much does ${keyword} cost?`,
      `Is ${keyword} worth it in 2026?`,
      `How do beginners start with ${keyword}?`,
      `What are common mistakes with ${keyword}?`,
    ],
    related: [`${keyword} for beginners`, `${keyword} cost`, `best ${keyword}`, `${keyword} vs alternatives`],
    featured: { title: "Quick answer", text: `${keyword} is a topic many readers search for. Here is the short answer.` },
  };
}

export function mockSources(keyword: string): Source[] {
  return [1, 2, 3, 4].map((i) => ({
    url: `https://research.example.org/${i}`,
    title: `Study ${i}: ${keyword} statistics`,
    snippet: `In 2025, ${40 + i * 7}% of surveyed users reported results with ${keyword}. Average cost was $${120 + i * 15}.`,
  }));
}

export function mockKeywords(keyword: string): Keyword[] {
  return [
    { keyword, type: "primary", intent: "informational", difficulty: "medium" },
    { keyword: `${keyword} guide`, type: "secondary", intent: "informational", difficulty: "low" },
    { keyword: `${keyword} cost`, type: "secondary", intent: "commercial", difficulty: "medium" },
    { keyword: `how to start ${keyword}`, type: "longtail", intent: "informational", difficulty: "low" },
    { keyword: `${keyword} for beginners`, type: "longtail", intent: "informational", difficulty: "low" },
    { keyword: `best ${keyword} tools`, type: "longtail", intent: "commercial", difficulty: "high" },
  ];
}

export function mockOutline(keyword: string): string {
  const t = keyword.charAt(0).toUpperCase() + keyword.slice(1);
  return `# ${t}: The Practical Guide for 2026

## What ${keyword} means (and why it matters now)
### A plain-English definition
### Who should care

## How ${keyword} works, step by step
### Step 1: Set a goal
### Step 2: Pick the right approach
### Step 3: Measure results

## What ${keyword} costs
### Typical price ranges
### Hidden costs people forget

## Common mistakes with ${keyword}
### Starting too big
### Skipping the basics

## ${keyword} vs the alternatives
### When to choose ${keyword}
### When something else is better

## FAQ
### What is ${keyword}?
### How much does ${keyword} cost?
### Is ${keyword} worth it in 2026?
### How do beginners start with ${keyword}?
### What are common mistakes with ${keyword}?

## Conclusion
`;
}

export async function mockDraftStream(
  keyword: string,
  outline: string,
  onChunk: (t: string) => void,
): Promise<string> {
  const lines = outline.split("\n");
  let full = "";
  const push = async (t: string) => {
    full += t;
    onChunk(t);
    await sleep(35);
  };
  for (const line of lines) {
    if (!line.trim()) continue;
    if (line.startsWith("#")) {
      await push(`${line}\n\n`);
      if (line.startsWith("### ")) {
        await push(
          `This part explains ${line.replace(/^#+\s*/, "").toLowerCase()} in simple terms. Keep the goal clear. Then act on it. Most readers get results when they start small and track one number [Source: research.example.org].\n\n`,
        );
      } else if (line.startsWith("## ") && !/faq|conclusion/i.test(line)) {
        await push(`Here is what you need to know about ${keyword} in this section.\n\n`);
      } else if (/conclusion/i.test(line)) {
        await push(
          `${keyword} rewards people who start simply. Pick one step from this guide and do it today.\n\n**Next step:** save this page and try step 1 this week.\n\n`,
        );
      }
    }
  }
  await push(`| Option | Cost | Best for |\n|---|---|---|\n| Basic | $120 | Beginners |\n| Pro | $180 | Teams |\n\n`);
  await push(`## Sources\n\n- [Study 1: ${keyword} statistics](https://research.example.org/1)\n- [Study 2: ${keyword} statistics](https://research.example.org/2)\n`);
  return full;
}

export function mockMeta(keyword: string): SeoMeta {
  const t = keyword.charAt(0).toUpperCase() + keyword.slice(1);
  return {
    metaTitle: `${t}: Practical Guide for 2026`.slice(0, 60),
    metaDescription: `Learn what ${keyword} is, what it costs, and how to start without common mistakes. A clear, step-by-step guide.`.slice(0, 155),
    urlSlug: keyword.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").split("-").slice(0, 6).join("-"),
    focusKeyword: keyword,
    secondaryKeywords: [`${keyword} guide`, `${keyword} cost`, `${keyword} for beginners`],
    schemaType: "Article",
  };
}
