"use client";

import { useState } from "react";
import type { Page, QAPair, TrainingDoc } from "@/lib/types";

type Tab = "sources" | "pages" | "qa";

export default function TrainingPanel({
  websiteId,
  baseUrl,
  initialPages,
  initialQA,
  initialDocs,
}: {
  websiteId: string;
  baseUrl: string;
  initialPages: Page[];
  initialQA: QAPair[];
  initialDocs: TrainingDoc[];
}) {
  const [tab, setTab] = useState<Tab>("sources");
  const [pages, setPages] = useState<Page[]>(initialPages);
  const [qa, setQA] = useState<QAPair[]>(initialQA);
  const [docs, setDocs] = useState<TrainingDoc[]>(initialDocs);
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [sitemapUrl, setSitemapUrl] = useState(
    baseUrl.replace(/\/$/, "") + "/sitemap.xml"
  );
  const [textTitle, setTextTitle] = useState("");
  const [textBody, setTextBody] = useState("");
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");

  async function reloadPages() {
    const res = await fetch(`/api/pages?websiteId=${websiteId}`);
    if (res.ok) setPages((await res.json()).pages);
  }

  function start(label: string) {
    setBusy(label);
    setError(null);
    setNote(null);
  }
  function fail(e: unknown) {
    setError(e instanceof Error ? e.message : "Something went wrong");
  }

  async function crawl() {
    start("crawl");
    setNote("Crawling… this can take a minute.");
    try {
      const res = await fetch("/api/crawl", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ websiteId }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Crawl failed");
      setNote(`Crawled ${d.pages} pages, ${d.chunks} chunks.`);
      await reloadPages();
    } catch (e) {
      setNote(null);
      fail(e);
    } finally {
      setBusy(null);
    }
  }

  async function importSitemap() {
    start("sitemap");
    setNote("Importing sitemap…");
    try {
      const res = await fetch("/api/train/sitemap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ websiteId, sitemapUrl }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Sitemap import failed");
      setNote(`Imported ${d.pages} pages, ${d.chunks} chunks.`);
      await reloadPages();
    } catch (e) {
      setNote(null);
      fail(e);
    } finally {
      setBusy(null);
    }
  }

  async function uploadFile(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const input = e.currentTarget.elements.namedItem("file") as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    start("file");
    setNote("Processing file…");
    try {
      const fd = new FormData();
      fd.append("websiteId", websiteId);
      fd.append("file", file);
      const res = await fetch("/api/train/file", { method: "POST", body: fd });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Upload failed");
      setNote(`Added "${d.title}" (${d.chunks} chunks).`);
      setDocs((x) => [
        { id: Math.random().toString(), website_id: websiteId, name: file.name, type: file.type || "file", source: "file", chars: 0, created_at: new Date().toISOString() },
        ...x,
      ]);
      input.value = "";
      await reloadPages();
    } catch (e2) {
      setNote(null);
      fail(e2);
    } finally {
      setBusy(null);
    }
  }

  async function addText(e: React.FormEvent) {
    e.preventDefault();
    if (!textBody.trim()) return;
    start("text");
    try {
      const res = await fetch("/api/train/text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ websiteId, title: textTitle, text: textBody }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Failed");
      setNote(`Added text (${d.chunks} chunks).`);
      setDocs((x) => [
        { id: Math.random().toString(), website_id: websiteId, name: textTitle || "Manual text", type: "text", source: "text", chars: textBody.length, created_at: new Date().toISOString() },
        ...x,
      ]);
      setTextTitle("");
      setTextBody("");
      await reloadPages();
    } catch (e2) {
      fail(e2);
    } finally {
      setBusy(null);
    }
  }

  async function deletePage(id: string) {
    if (!confirm("Delete this page?")) return;
    const res = await fetch(`/api/pages/${id}`, { method: "DELETE" });
    if (res.ok) setPages((p) => p.filter((x) => x.id !== id));
  }

  async function addQA(e: React.FormEvent) {
    e.preventDefault();
    if (!question.trim() || !answer.trim()) return;
    start("qa");
    try {
      const res = await fetch("/api/qa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ websiteId, question, answer }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Failed");
      setQA((x) => [d.qa, ...x]);
      setQuestion("");
      setAnswer("");
      setNote("Q&A added.");
    } catch (e2) {
      fail(e2);
    } finally {
      setBusy(null);
    }
  }

  async function deleteQA(id: string) {
    const res = await fetch(`/api/qa/${id}`, { method: "DELETE" });
    if (res.ok) setQA((x) => x.filter((q) => q.id !== id));
  }

  const field =
    "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200";
  const btn =
    "rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-60";
  const card = "rounded-2xl border border-slate-200 bg-white p-5 shadow-sm";

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {(["sources", "pages", "qa"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-lg px-4 py-2 text-sm font-medium capitalize transition ${
              tab === t ? "bg-indigo-600 text-white" : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            {t === "qa" ? "Q&A" : t}
            {t === "pages" ? ` (${pages.length})` : ""}
          </button>
        ))}
      </div>

      {(note || error) && (
        <div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          {note && <p className="text-sm text-slate-600">{note}</p>}
        </div>
      )}

      {tab === "sources" && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className={card}>
            <h3 className="font-semibold text-slate-900">Crawl website</h3>
            <p className="mt-1 text-sm text-slate-500">Fetch and index public pages from {baseUrl}.</p>
            <button onClick={crawl} disabled={busy === "crawl"} className={`mt-3 ${btn}`}>
              {busy === "crawl" ? "Crawling…" : "Start crawl"}
            </button>
          </div>

          <div className={card}>
            <h3 className="font-semibold text-slate-900">Import sitemap</h3>
            <input value={sitemapUrl} onChange={(e) => setSitemapUrl(e.target.value)} className={`mt-3 ${field}`} />
            <button onClick={importSitemap} disabled={busy === "sitemap"} className={`mt-3 ${btn}`}>
              {busy === "sitemap" ? "Importing…" : "Import sitemap"}
            </button>
          </div>

          <form onSubmit={uploadFile} className={card}>
            <h3 className="font-semibold text-slate-900">Upload file</h3>
            <p className="mt-1 text-sm text-slate-500">PDF, TXT, MD or HTML.</p>
            <input type="file" name="file" accept=".pdf,.txt,.md,.html,.htm,.csv" className="mt-3 block w-full text-sm" />
            <button type="submit" disabled={busy === "file"} className={`mt-3 ${btn}`}>
              {busy === "file" ? "Uploading…" : "Upload & train"}
            </button>
          </form>

          <form onSubmit={addText} className={card}>
            <h3 className="font-semibold text-slate-900">Add text</h3>
            <input value={textTitle} onChange={(e) => setTextTitle(e.target.value)} placeholder="Title (optional)" className={`mt-3 ${field}`} />
            <textarea value={textBody} onChange={(e) => setTextBody(e.target.value)} rows={4} placeholder="Paste any text knowledge…" className={`mt-2 ${field}`} />
            <button type="submit" disabled={busy === "text"} className={`mt-3 ${btn}`}>
              {busy === "text" ? "Adding…" : "Add text"}
            </button>
          </form>

          {docs.length > 0 && (
            <div className={`md:col-span-2 ${card}`}>
              <h3 className="font-semibold text-slate-900">Uploaded sources</h3>
              <ul className="mt-3 divide-y divide-slate-100">
                {docs.map((d) => (
                  <li key={d.id} className="flex items-center justify-between py-2 text-sm">
                    <span className="truncate text-slate-700">{d.name}</span>
                    <span className="text-xs text-slate-400">{d.source}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {tab === "pages" && (
        <div className={card}>
          {pages.length === 0 ? (
            <p className="py-6 text-center text-slate-500">No pages yet. Add a source first.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="text-xs uppercase tracking-wide text-slate-400">
                    <th className="px-3 py-2">Title</th>
                    <th className="px-3 py-2">Source</th>
                    <th className="px-3 py-2">URL</th>
                    <th className="px-3 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {pages.map((p) => (
                    <tr key={p.id} className="border-t border-slate-100">
                      <td className="max-w-[12rem] truncate px-3 py-2 text-slate-800">{p.title || "Untitled"}</td>
                      <td className="px-3 py-2"><span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs">{p.source}</span></td>
                      <td className="max-w-[16rem] truncate px-3 py-2">
                        <a href={p.url} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline">{p.url}</a>
                      </td>
                      <td className="px-3 py-2 text-right">
                        <button onClick={() => deletePage(p.id)} className="rounded-md border border-red-200 px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50">Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === "qa" && (
        <div className="space-y-4">
          <form onSubmit={addQA} className={card}>
            <h3 className="font-semibold text-slate-900">Add custom Q&amp;A</h3>
            <p className="mt-1 text-sm text-slate-500">Exact answers for common questions (used before website search).</p>
            <input value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="Question" className={`mt-3 ${field}`} />
            <textarea value={answer} onChange={(e) => setAnswer(e.target.value)} rows={2} placeholder="Answer" className={`mt-2 ${field}`} />
            <button type="submit" disabled={busy === "qa"} className={`mt-3 ${btn}`}>Add Q&amp;A</button>
          </form>

          <div className={card}>
            {qa.length === 0 ? (
              <p className="py-6 text-center text-slate-500">No Q&amp;A pairs yet.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {qa.map((q) => (
                  <li key={q.id} className="py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-slate-800">{q.question}</p>
                        <p className="mt-1 text-sm text-slate-600">{q.answer}</p>
                      </div>
                      <button onClick={() => deleteQA(q.id)} className="shrink-0 rounded-md border border-red-200 px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50">Delete</button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
