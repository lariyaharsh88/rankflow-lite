import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { errMessage, jsonError, loadOwnedArticle, requireUser } from "@/lib/api";
import { toArticleView } from "@/lib/article";
import { runResearch } from "@/lib/pipeline/research";

export const maxDuration = 60;

/** Step 2: Google results + sources + keyword map. Re-runnable. */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  const { id } = await params;
  const found = await loadOwnedArticle(id, auth.user.id);
  if (!found.ok) return found.response;

  try {
    const r = await runResearch(found.article);
    const article = await db.article.update({
      where: { id },
      data: {
        keywordsJson: JSON.stringify(r.keywords),
        sourcesJson: JSON.stringify(r.sources),
        paasJson: JSON.stringify(r.paas),
        relatedJson: JSON.stringify(r.related),
        researchContext: r.researchContext,
        serpContext: r.serpContext,
        researchNotes: r.notes,
        step: found.article.step === "research" ? "outline" : found.article.step,
      },
    });
    return NextResponse.json({ article: toArticleView(article) });
  } catch (e) {
    return jsonError(errMessage(e, "Research failed."), 500);
  }
}
