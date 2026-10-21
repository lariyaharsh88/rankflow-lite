import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { errMessage, jsonError, loadOwnedArticle, requireUser } from "@/lib/api";
import { toArticleView } from "@/lib/article";
import { generateSeoMeta } from "@/lib/pipeline/seo";

export const maxDuration = 60;

/** Step 5: generate title, description, slug and keyword fields from the draft. */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  const { id } = await params;
  const found = await loadOwnedArticle(id, auth.user.id);
  if (!found.ok) return found.response;
  if (!found.article.draft.trim()) return jsonError("Write the draft first.");

  try {
    const meta = await generateSeoMeta(found.article);
    const article = await db.article.update({
      where: { id },
      data: { metaJson: JSON.stringify(meta) },
    });
    return NextResponse.json({ article: toArticleView(article) });
  } catch (e) {
    return jsonError(errMessage(e, "SEO package failed."), 500);
  }
}
