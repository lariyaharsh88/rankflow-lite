import { db } from "@/lib/db";
import { loadOwnedArticle, requireUser } from "@/lib/api";
import { countWords } from "@/lib/markdown";
import { streamDraft } from "@/lib/pipeline/draft";

export const maxDuration = 300;

const enc = new TextEncoder();
const sse = (obj: Record<string, unknown>) => enc.encode(`data: ${JSON.stringify(obj)}\n\n`);

/**
 * Step 4: stream the article as Server-Sent Events.
 * Events: {text} chunks, then {done, wordCount} or {error}.
 * The draft is saved to the database as it streams, so a closed tab loses nothing.
 */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  const { id } = await params;
  const found = await loadOwnedArticle(id, auth.user.id);
  if (!found.ok) return found.response;
  const article = found.article;
  if (!article.outline.trim()) {
    return new Response(JSON.stringify({ error: "Approve an outline first." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const stream = new ReadableStream({
    async start(controller) {
      let full = "";
      let lastSave = Date.now();
      let closed = false;
      const send = (obj: Record<string, unknown>) => {
        if (closed) return;
        try {
          controller.enqueue(sse(obj));
        } catch {
          closed = true;
        }
      };
      const save = async (final: boolean) => {
        await db.article.update({
          where: { id },
          data: {
            draft: full,
            wordCount: countWords(full),
            ...(final ? { step: article.step === "draft" ? "seo" : article.step, metaJson: "" } : {}),
          },
        });
      };

      try {
        await streamDraft(article, (chunk) => {
          full += chunk;
          send({ text: chunk });
          if (Date.now() - lastSave > 2500) {
            lastSave = Date.now();
            void save(false).catch(() => {});
          }
        });
        if (!full.trim()) throw new Error("The model returned an empty draft. Try again.");
        await save(true);
        send({ done: true, wordCount: countWords(full) });
      } catch (e) {
        if (full.trim()) await save(false).catch(() => {});
        send({ error: e instanceof Error ? e.message : "Draft failed." });
      } finally {
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
