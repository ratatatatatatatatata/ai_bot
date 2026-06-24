"use client";

import { useState } from "react";
import Link from "next/link";
import type { Website } from "@/lib/types";

function StatusBadge({ status }: { status: Website["status"] }) {
  const styles: Record<Website["status"], string> = {
    idle: "bg-slate-100 text-slate-600",
    crawling: "bg-amber-100 text-amber-700",
    done: "bg-green-100 text-green-700",
    error: "bg-red-100 text-red-700",
  };
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[status]}`}>
      {status}
    </span>
  );
}

export default function WebsitesManager({
  initialWebsites,
}: {
  initialWebsites: Website[];
}) {
  const [websites, setWebsites] = useState<Website[]>(initialWebsites);
  const [url, setUrl] = useState("");
  const [name, setName] = useState("");
  const [adding, setAdding] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    const res = await fetch("/api/websites");
    if (res.ok) {
      const { websites } = await res.json();
      setWebsites(websites);
    }
  }

  async function addWebsite(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setAdding(true);
    try {
      const res = await fetch("/api/websites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ base_url: url, name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add website");
      setWebsites((w) => [data.website, ...w]);
      setUrl("");
      setName("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add website");
    } finally {
      setAdding(false);
    }
  }

  async function crawl(id: string) {
    setError(null);
    setBusyId(id);
    setWebsites((ws) =>
      ws.map((w) => (w.id === id ? { ...w, status: "crawling" } : w))
    );
    try {
      const res = await fetch("/api/crawl", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ websiteId: id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Crawl failed");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Crawl failed");
    } finally {
      setBusyId(null);
      refresh();
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this website and all its data?")) return;
    setBusyId(id);
    try {
      const res = await fetch(`/api/websites/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Delete failed");
      }
      setWebsites((w) => w.filter((x) => x.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Websites</h1>
        <p className="text-sm text-slate-500">
          Add a website, then crawl it to build the chatbot&apos;s knowledge base.
        </p>
      </div>

      {/* Add form */}
      <form
        onSubmit={addWebsite}
        className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_1fr_auto]">
          <input
            type="text"
            required
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com"
            className="rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
          />
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Name (optional)"
            className="rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
          />
          <button
            type="submit"
            disabled={adding}
            className="rounded-lg bg-indigo-600 px-5 py-2 font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-60"
          >
            {adding ? "Adding…" : "Add website"}
          </button>
        </div>
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      </form>

      {/* List */}
      {websites.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">
          No websites yet. Add one above to get started.
        </div>
      ) : (
        <div className="space-y-3">
          {websites.map((w) => (
            <div
              key={w.id}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="truncate font-semibold text-slate-900">
                      {w.name || w.base_url}
                    </h3>
                    <StatusBadge status={w.status} />
                  </div>
                  <a
                    href={w.base_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm text-indigo-600 hover:underline"
                  >
                    {w.base_url}
                  </a>
                  <p className="mt-1 text-xs text-slate-500">
                    {w.pages_count} pages
                    {w.last_crawled_at
                      ? ` · last crawled ${new Date(
                          w.last_crawled_at
                        ).toLocaleString()}`
                      : " · not crawled yet"}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => crawl(w.id)}
                    disabled={busyId === w.id || w.status === "crawling"}
                    className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:opacity-60"
                  >
                    {w.status === "crawling"
                      ? "Crawling…"
                      : w.pages_count > 0
                        ? "Re-crawl"
                        : "Crawl"}
                  </button>
                  <Link
                    href={`/dashboard/websites/${w.id}`}
                    className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                  >
                    Manage
                  </Link>
                  <button
                    onClick={() => remove(w.id)}
                    disabled={busyId === w.id}
                    className="rounded-lg border border-red-200 px-3 py-1.5 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-60"
                  >
                    Delete
                  </button>
                </div>
              </div>
              {w.status === "error" && w.status_message && (
                <p className="mt-2 text-sm text-red-600">{w.status_message}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
