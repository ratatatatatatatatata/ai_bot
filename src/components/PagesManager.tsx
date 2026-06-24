"use client";

import { useState } from "react";
import type { Page } from "@/lib/types";

export default function PagesManager({
  websiteId,
  initialPages,
}: {
  websiteId: string;
  initialPages: Page[];
}) {
  const [pages, setPages] = useState<Page[]>(initialPages);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  async function loadPages() {
    const res = await fetch(`/api/pages?websiteId=${websiteId}`);
    if (res.ok) setPages((await res.json()).pages);
  }

  async function recrawl() {
    setError(null);
    setNote("Crawling… this can take a minute for larger sites.");
    setBusy(true);
    try {
      const res = await fetch("/api/crawl", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ websiteId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Crawl failed");
      setNote(`Done: indexed ${data.pages} pages, ${data.chunks} chunks.`);
      await loadPages();
    } catch (err) {
      setNote(null);
      setError(err instanceof Error ? err.message : "Crawl failed");
    } finally {
      setBusy(false);
    }
  }

  async function deletePage(id: string) {
    if (!confirm("Delete this page from the knowledge base?")) return;
    const res = await fetch(`/api/pages/${id}`, { method: "DELETE" });
    if (res.ok) setPages((p) => p.filter((x) => x.id !== id));
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-5">
        <div>
          <h2 className="font-semibold text-slate-900">
            Crawled pages ({pages.length})
          </h2>
          <p className="text-sm text-slate-500">
            Pages indexed into the chatbot&apos;s knowledge base.
          </p>
        </div>
        <button
          onClick={recrawl}
          disabled={busy}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-60"
        >
          {busy ? "Crawling…" : "Re-crawl website"}
        </button>
      </div>

      {(error || note) && (
        <div className="px-5 pt-4">
          {error && <p className="text-sm text-red-600">{error}</p>}
          {note && <p className="text-sm text-slate-600">{note}</p>}
        </div>
      )}

      {pages.length === 0 ? (
        <p className="p-8 text-center text-slate-500">
          No pages yet. Click “Re-crawl website” to fetch content.
        </p>
      ) : (
        <div className="overflow-x-auto p-2">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-xs uppercase tracking-wide text-slate-400">
                <th className="px-3 py-2">Title</th>
                <th className="px-3 py-2">URL</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {pages.map((p) => (
                <tr key={p.id} className="border-t border-slate-100">
                  <td className="max-w-xs truncate px-3 py-2 text-slate-800">
                    {p.title || "Untitled"}
                  </td>
                  <td className="max-w-sm truncate px-3 py-2">
                    <a
                      href={p.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-indigo-600 hover:underline"
                    >
                      {p.url}
                    </a>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button
                      onClick={() => deletePage(p.id)}
                      className="rounded-md border border-red-200 px-2.5 py-1 text-xs font-medium text-red-600 transition hover:bg-red-50"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
