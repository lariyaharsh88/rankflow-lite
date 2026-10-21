import { extractH1, markdownToPlainText } from "@/lib/markdown";
import type { SeoMeta } from "@/lib/types";

export type ScoreStatus = "good" | "ok" | "poor";

export interface ScoreAspect {
  id: string;
  label: string;
  score: number;
  status: ScoreStatus;
  tips: string[];
}

export interface SeoScore {
  overall: number;
  aspects: ScoreAspect[];
  wordCount: number;
}

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));
const status = (s: number): ScoreStatus => (s >= 80 ? "good" : s >= 50 ? "ok" : "poor");
const norm = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();

function occurrences(hay: string, needle: string): number {
  if (!needle) return 0;
  let n = 0;
  let pos = 0;
  for (;;) {
    const i = hay.indexOf(needle, pos);
    if (i === -1) return n;
    n++;
    pos = i + needle.length;
  }
}

/** Heuristic on-page score, Yoast-style. No network calls. */
export function computeSeoScore(markdown: string, meta: SeoMeta | null, focusKeyword: string): SeoScore {
  const plain = markdownToPlainText(markdown);
  const plainNorm = norm(plain);
  const words = plain.split(/\s+/).filter(Boolean).length;
  const kw = norm(meta?.focusKeyword || focusKeyword);
  const h1 = extractH1(markdown);
  const h2s = (markdown.match(/^##\s+.+$/gm) ?? []).map((l) => l.replace(/^##\s+/, ""));
  const h3Count = (markdown.match(/^###\s+/gm) ?? []).length;
  const aspects: ScoreAspect[] = [];

  // Title & description
  {
    const tips: string[] = [];
    const title = meta?.metaTitle?.trim() ?? "";
    const desc = meta?.metaDescription?.trim() ?? "";
    let s = 50;
    if (title) {
      const len = title.length;
      s = len >= 45 && len <= 60 ? 100 : len >= 35 && len <= 65 ? 78 : clamp(55 - Math.abs(len - 52) * 2, 25, 70);
      if (len > 60) tips.push("Shorten the title to 60 characters or fewer so Google does not cut it off.");
      if (kw && !norm(title).includes(kw)) {
        s -= 20;
        tips.push("Put the focus keyword in the title.");
      }
    } else tips.push("Add a title.");
    if (desc) {
      const d = desc.length;
      const dp = d >= 120 && d <= 155 ? 100 : d >= 100 && d <= 170 ? 75 : clamp(60 - Math.abs(d - 140) / 3, 30, 65);
      s = Math.round((s + dp) / 2);
      if (d > 155) tips.push("Trim the description to 155 characters.");
      if (kw && !norm(desc).includes(kw)) {
        s -= 12;
        tips.push("Mention the focus keyword in the description.");
      }
    } else tips.push("Add a meta description of 120–155 characters.");
    aspects.push({ id: "title", label: "Title & description", score: clamp(s, 0, 100), status: status(clamp(s, 0, 100)), tips });
  }

  // Focus keyword use
  {
    const tips: string[] = [];
    let s = 40;
    if (!kw) tips.push("Set a focus keyword.");
    else {
      const inTitle = norm(h1).includes(kw) || norm(meta?.metaTitle ?? "").includes(kw);
      const inIntro = plainNorm.split(/\s+/).slice(0, 100).join(" ").includes(kw);
      const inH2 = norm(h2s.join(" ")).includes(kw);
      const occ = occurrences(plainNorm, kw);
      const density = words ? (occ / words) * 100 : 0;
      if (inTitle) s += 25; else tips.push("Use the keyword in the H1.");
      if (inIntro) s += 20; else tips.push("Mention the keyword in the first 100 words.");
      if (inH2) s += 15; else tips.push("Include the keyword in at least one H2.");
      if (density >= 0.4 && density <= 2.8) s += 15;
      else if (density > 2.8) { s -= 15; tips.push("Keyword density is high. Vary the wording."); }
      else if (words > 200 && occ < 2) tips.push("Use the keyword a few more times, naturally.");
    }
    s = clamp(s, 0, 100);
    aspects.push({ id: "keyword", label: "Focus keyword", score: s, status: status(s), tips });
  }

  // Length
  {
    const tips: string[] = [];
    const s = words >= 1800 ? 98 : words >= 1200 ? 90 : words >= 800 ? 82 : words >= 600 ? 72 : words >= 400 ? 58 : clamp(25 + words / 15, 20, 45);
    if (words < 800) tips.push("Articles over 800 words usually compete better.");
    aspects.push({ id: "length", label: "Length", score: s, status: status(s), tips });
  }

  // Structure
  {
    const tips: string[] = [];
    let s = h2s.length >= 3 ? 92 : h2s.length === 2 ? 78 : h2s.length === 1 ? 58 : 38;
    if (h2s.length < 2) tips.push("Add more H2 sections.");
    if (h3Count === 0 && words > 500) tips.push("Add H3 subheadings under big sections.");
    if (h3Count >= 2) s = clamp(s + 5, 0, 100);
    aspects.push({ id: "structure", label: "Headings", score: s, status: status(s), tips });
  }

  // Readability
  {
    const tips: string[] = [];
    const sents = plain.split(/(?<=[.!?])\s+/).map((x) => x.trim()).filter(Boolean);
    let s = 70;
    if (sents.length) {
      const lens = sents.map((x) => x.split(/\s+/).length);
      const avg = lens.reduce((a, b) => a + b, 0) / sents.length;
      s = avg >= 12 && avg <= 22 ? 90 : avg <= 30 ? 72 : 52;
      if (avg > 22) tips.push("Split long sentences. Aim for 15–20 words on average.");
      if (lens.filter((l) => l > 35).length / sents.length > 0.25) {
        s = clamp(s - 15, 0, 100);
        tips.push("Several sentences run past 35 words.");
      }
    }
    aspects.push({ id: "readability", label: "Readability", score: s, status: status(s), tips });
  }

  // Links
  {
    const tips: string[] = [];
    const ext = (markdown.match(/\]\(https?:\/\/[^)]+\)/g) ?? []).length;
    let s = 45;
    if (ext >= 2) s += 45; else if (ext === 1) { s += 25; tips.push("Link to one or two more authoritative sources."); } else tips.push("Add links to sources that back your claims.");
    const tables = (markdown.match(/^\|.+\|$/gm) ?? []).length > 2;
    if (tables) s += 10; else tips.push("A comparison table helps readers and featured snippets.");
    s = clamp(s, 0, 100);
    aspects.push({ id: "links", label: "Links & tables", score: s, status: status(s), tips });
  }

  const weights = [1.2, 1.2, 0.9, 1, 0.9, 0.8];
  let sum = 0;
  let wsum = 0;
  aspects.forEach((a, i) => {
    sum += a.score * weights[i];
    wsum += weights[i];
  });
  return { overall: clamp(Math.round(sum / wsum), 0, 100), aspects, wordCount: words };
}
