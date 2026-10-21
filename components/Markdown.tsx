"use client";

import { useMemo } from "react";
import { markdownToHtml } from "@/lib/markdown";

export function Markdown({ source, streaming = false }: { source: string; streaming?: boolean }) {
  const html = useMemo(() => markdownToHtml(source), [source]);
  return (
    <div
      className={`article-prose ${streaming ? "streaming-caret" : ""}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
