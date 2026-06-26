"use client";

import { useState } from "react";
import Link from "next/link";
import type { Chatbot, Website } from "@/lib/types";

export default function BotsManager({
  initialBots,
  websites,
}: {
  initialBots: Chatbot[];
  websites: Website[];
}) {
  const [bots, setBots] = useState<Chatbot[]>(initialBots);
  const [websiteId, setWebsiteId] = useState(websites[0]?.id ?? "");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const websiteName = (wid: string) =>
    websites.find((w) => w.id === wid)?.name || "—";

  async function createBot(e: React.FormEvent) {
    e.preventDefault();
    if (!websiteId) {
      setError("Create a knowledge base first.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/chatbots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ websiteId, name }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Failed");
      setBots((b) => [d.chatbot, ...b]);
      setName("");
    } catch (e2) {
      setError(e2 instanceof Error ? e2.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  async function toggleStatus(bot: Chatbot) {
    const status = bot.status === "active" ? "paused" : "active";
    const res = await fetch(`/api/chatbots/${bot.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) setBots((b) => b.map((x) => (x.id === bot.id ? { ...x, status } : x)));
  }

  async function remove(id: string) {
    if (!confirm("Delete this chatbot?")) return;
    const res = await fetch(`/api/chatbots/${id}`, { method: "DELETE" });
    if (res.ok) setBots((b) => b.filter((x) => x.id !== id));
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Chatbots</h1>
        <p className="text-sm text-slate-500">
          Each bot is tied to a knowledge base. Customize and embed it anywhere.
        </p>
      </div>

      <form className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm" onSubmit={createBot}>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_1fr_auto]">
          <select
            value={websiteId}
            onChange={(e) => setWebsiteId(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            {websites.length === 0 && <option value="">No knowledge base</option>}
            {websites.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name || w.base_url}
              </option>
            ))}
          </select>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Bot name (optional)"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <button type="submit" disabled={busy} className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60">
            {busy ? "Creating…" : "New chatbot"}
          </button>
        </div>
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      </form>

      {bots.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">
          No chatbots yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {bots.map((bot) => (
            <div key={bot.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full" style={{ background: bot.primary_color }} />
                    <h3 className="truncate font-semibold text-slate-900">{bot.name}</h3>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    {websiteName(bot.website_id)} · {bot.ai_model}
                  </p>
                </div>
                <button
                  onClick={() => toggleStatus(bot)}
                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    bot.status === "active"
                      ? "bg-green-100 text-green-700"
                      : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {bot.status}
                </button>
              </div>
              <div className="mt-4 flex gap-2">
                <Link
                  href={`/dashboard/chatbots/${bot.id}`}
                  className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700"
                >
                  Customize
                </Link>
                <button
                  onClick={() => remove(bot.id)}
                  className="rounded-lg border border-red-200 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
