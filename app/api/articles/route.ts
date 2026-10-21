import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { jsonError, requireUser } from "@/lib/api";
import { toArticleView } from "@/lib/article";

const INTENTS = ["informational", "commercial", "transactional"];
const LENGTHS = ["short", "standard", "long"];

/** Step 1: create an article from a keyword. */
export async function POST(request: Request) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  let body: { keyword?: string; audience?: string; intent?: string; length?: string };
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid request.");
  }
  const keyword = body.keyword?.trim().replace(/\s+/g, " ") ?? "";
  if (keyword.length < 2) return jsonError("Enter the keyword you want to rank for.");
  if (keyword.length > 120) return jsonError("Keep the keyword under 120 characters.");

  const article = await db.article.create({
    data: {
      userId: auth.user.id,
      keyword,
      audience: body.audience?.trim().slice(0, 160) ?? "",
      intent: INTENTS.includes(body.intent ?? "") ? (body.intent as string) : "informational",
      length: LENGTHS.includes(body.length ?? "") ? (body.length as string) : "standard",
    },
  });
  return NextResponse.json({ article: toArticleView(article) });
}

export async function GET() {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  const rows = await db.article.findMany({
    where: { userId: auth.user.id },
    orderBy: { updatedAt: "desc" },
  });
  return NextResponse.json({ articles: rows.map(toArticleView) });
}
