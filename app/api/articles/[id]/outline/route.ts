import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { errMessage, jsonError, loadOwnedArticle, requireUser } from "@/lib/api";
import { toArticleView } from "@/lib/article";
import { generateOutline } from "@/lib/pipeline/outline";

export const maxDuration = 60;

/** Step 3: generate (or regenerate) the outline. */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  const { id } = await params;
  const found = await loadOwnedArticle(id, auth.user.id);
  if (!found.ok) return found.response;
  if (!found.article.keywordsJson || found.article.keywordsJson === "[]") {
    return jsonError("Run research first.");
  }

  try {
    const outline = await generateOutline(found.article);
    if (!outline.trim()) return jsonError("The model returned an empty outline. Try again.", 502);
    const article = await db.article.update({
      where: { id },
      data: { outline },
    });
    return NextResponse.json({ article: toArticleView(article) });
  } catch (e) {
    return jsonError(errMessage(e, "Outline failed."), 500);
  }
}
