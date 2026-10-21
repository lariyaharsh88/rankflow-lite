"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function DeleteArticleButton({ id, keyword }: { id: string; keyword: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      disabled={busy}
      onClick={async () => {
        if (!window.confirm(`Delete “${keyword}”? This cannot be undone.`)) return;
        setBusy(true);
        await fetch(`/api/articles/${id}`, { method: "DELETE" });
        router.refresh();
      }}
      className="text-xs text-slate-400 hover:text-red-600 disabled:opacity-50"
    >
      Delete
    </button>
  );
}
