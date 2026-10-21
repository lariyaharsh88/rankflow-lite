import { notFound, redirect } from "next/navigation";
import { Nav } from "@/components/Nav";
import { ArticleFlow } from "@/components/ArticleFlow";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { toArticleView } from "@/lib/article";
import { keyStatus } from "@/lib/providers/keys";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const a = await db.article.findUnique({ where: { id }, select: { keyword: true } });
  return { title: a?.keyword ?? "Article" };
}

export default async function ArticlePage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const { id } = await params;
  const article = await db.article.findFirst({ where: { id, userId: user.id } });
  if (!article) notFound();

  return (
    <>
      <Nav />
      <main className="mx-auto max-w-5xl px-4 py-8">
        <ArticleFlow initial={toArticleView(article)} geminiReady={keyStatus().gemini} />
      </main>
    </>
  );
}
