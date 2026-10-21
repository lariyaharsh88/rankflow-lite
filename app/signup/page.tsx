import { Suspense } from "react";
import { Nav } from "@/components/Nav";
import { AuthForm } from "@/components/AuthForm";

export const metadata = { title: "Create your account" };

export default function Page() {
  return (
    <>
      <Nav />
      <main className="mx-auto max-w-md px-4 py-16">
        <h1 className="mb-6 text-2xl font-bold text-slate-900">Create your account</h1>
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <Suspense>
            <AuthForm mode="signup" />
          </Suspense>
        </div>
      </main>
    </>
  );
}
