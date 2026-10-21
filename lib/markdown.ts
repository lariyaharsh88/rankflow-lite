import { marked } from "marked";

marked.setOptions({ gfm: true });

export function markdownToHtml(markdown: string): string {
  const raw = markdown.trim();
  if (!raw) return "";
  return marked.parse(raw, { async: false }) as string;
}

/** Strip markdown enough for word counts and keyword search. */
export function markdownToPlainText(md: string): string {
  let t = md;
  t = t.replace(/```[\s\S]*?```/g, " ");
  t = t.replace(/`[^`]+`/g, " ");
  t = t.replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1 ");
  t = t.replace(/\[([^\]]+)\]\([^)]*\)/g, "$1 ");
  t = t.replace(/^#{1,6}\s+/gm, " ");
  t = t.replace(/\*\*([^*]+)\*\*/g, "$1");
  t = t.replace(/\*([^*]+)\*/g, "$1");
  t = t.replace(/^>\s+/gm, "");
  t = t.replace(/^[-*+]\s+/gm, "");
  t = t.replace(/^\d+\.\s+/gm, "");
  t = t.replace(/\|/g, " ");
  return t.replace(/\s+/g, " ").trim();
}

export function countWords(markdown: string): number {
  return markdownToPlainText(markdown).split(/\s+/).filter(Boolean).length;
}

export function extractH1(md: string): string {
  const m = md.match(/^#\s+(.+)$/m);
  return m ? m[1].trim() : "";
}

/** Full standalone HTML document for download / paste into a CMS. */
export function markdownToHtmlDocument(markdown: string, title: string, description: string): string {
  const body = markdownToHtml(markdown);
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}" />
</head>
<body>
<article>
${body}
</article>
</body>
</html>
`;
}
