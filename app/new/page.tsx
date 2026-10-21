import { Nav } from "@/components/Nav";
import { KeywordForm } from "@/components/KeywordForm";
import { Stepper } from "@/components/Stepper";

export const metadata = { title: "New article" };

export default function NewArticlePage() {
  return (
    <>
      <Nav />
      <main className="mx-auto max-w-3xl px-4 py-8">
        <Stepper current="keyword" reached="keyword" />
        <div className="mt-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="text-xl font-bold text-slate-900">Step 1 · Keyword</h1>
          <p className="mb-6 mt-1 text-sm text-slate-600">What should this article rank for?</p>
          <KeywordForm />
        </div>
      </main>
    </>
  );
}
