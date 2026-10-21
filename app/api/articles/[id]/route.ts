import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { jsonError, loadOwnedArticle, requireUser } from "@/lib/api";
import { isSeoMeta, toArticleView } from "@/lib/article";
import { countWords } from "@/lib/markdown";
import { sanitizeMeta } from "@/lib/pipeline/seo";

type Params = { params: Promise<{ id: string }> };
const STEPS = ["research", "outline", "draft", "seo", "done"];

export async function GET(_req: Request, { params }: Params) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  const { id } = await params;
  const found = await loadOwnedArticle(id, auth.user.id);
  if (!found.ok) return found.response;
  return NextResponse.json({ article: toArticleView(found.article) });
}

/** Save user edits (outline, draft, meta) or move the step pointer. */
export async function PATCH(request: Request, { params }: Params) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  const { id } = await params;
  const found = await loadOwnedArticle(id, auth.user.id);
  if (!found.ok) return found.response;

  let body: { outline?: string; draft?: string; meta?: unknown; step?: string };
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid request.");
  }

  const data: Record<string, unknown> = {};
  if (typeof body.outline === "string") data.outline = body.outline.slice(0, 20_000);
  if (typeof body.draft === "string") {
    data.draft = body.draft.slice(0, 200_000);
    data.wordCount = countWords(body.draft);
  }
  if (body.meta !== undefined) {
    if (!isSeoMeta(body.meta)) return jsonError("Invalid SEO fields.");
    data.metaJson = JSON.stringify(sanitizeMeta(body.meta));
  }
  if (typeof body.step === "string") {
    if (!STEPS.includes(body.step)) return jsonError("Invalid step.");
    data.step = body.step;
  }
  if (Object.keys(data).length === 0) return jsonError("Nothing to update.");

  const article = await db.article.update({ where: { id }, data });
  return NextResponse.json({ article: toArticleView(article) });
}

export async function DELETE(_req: Request, { params }: Params) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  const { id } = await params;
  const found = await loadOwnedArticle(id, auth.user.id);
  if (!found.ok) return found.response;
  await db.article.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
