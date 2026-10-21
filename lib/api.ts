import { NextResponse } from "next/server";
import type { Article } from "@prisma/client";
import { db } from "@/lib/db";
import { getCurrentUser, type SessionUser } from "@/lib/auth";

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

/** Resolves the signed-in user or a ready-to-return 401. */
export async function requireUser(): Promise<
  { ok: true; user: SessionUser } | { ok: false; response: NextResponse }
> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, response: jsonError("Please sign in.", 401) };
  return { ok: true, user };
}

export async function loadOwnedArticle(
  id: string,
  userId: string,
): Promise<{ ok: true; article: Article } | { ok: false; response: NextResponse }> {
  const article = await db.article.findFirst({ where: { id, userId } });
  if (!article) return { ok: false, response: jsonError("Article not found.", 404) };
  return { ok: true, article };
}

export function errMessage(e: unknown, fallback: string): string {
  return e instanceof Error && e.message ? e.message : fallback;
}
