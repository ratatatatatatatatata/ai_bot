"use client";

import { useMemo, useState } from "react";
import EmbedSnippet from "@/components/EmbedSnippet";
import type { Chatbot, Website } from "@/lib/types";

export default function SettingsForm({
  chatbots,
  websites,
  appUrl,
}: {
  chatbots: Chatbot[];
  websites: Website[];
  appUrl: string;
}) {
  const websiteName = useMemo(() => {
    const map = new Map(websites.map((w) => [w.id, w.name || w.base_url]));
    return (id: string) => map.get(id) || "Website";
  }, [websites]);

  const [bots, setBots] = useState<Chatbot[]>(chatbots);
  const [selectedId, setSelectedId] = useState<string>(chatbots[0]?.id ?? "");
  const selected = bots.find((b) => b.id === selectedId);

  const [form, setForm] = useState({
    name: selected?.name ?? "",
    welcome_message: selected?.welcome_message ?? "",
    primary_color: selected?.primary_color ?? "#4f46e5",
    logo_url: selected?.logo_url ?? "",
    fallback_message: selected?.fallback_message ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function pick(id: string) {
    setSelectedId(id);
    const b = bots.find((x) => x.id === id);
    if (b) {
      setForm({
        name: b.name,
        welcome_message: b.welcome_message,
        primary_color: b.primary_color,
        logo_url: b.logo_url ?? "",
        fallback_message: b.fallback_message,
      });
      setSaved(false);
      setError(null);
    }
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) return;
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      const res = await fetch(`/api/chatbots/${selected.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      setBots((bs) => bs.map((b) => (b.id === selected.id ? data.chatbot : b)));
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  if (!selected) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">
        No chatbots yet. Add a website first — a chatbot is created automatically.
      </div>
    );
  }

  const field =
    "mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Customize chatbot</h1>
        <p className="text-sm text-slate-500">
          Appearance and messages for your embedded widget.
        </p>
      </div>

      {bots.length > 1 && (
        <select
          value={selectedId}
          onChange={(e) => pick(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2"
        >
          {bots.map((b) => (
            <option key={b.id} value={b.id}>
              {websiteName(b.website_id)} — {b.name}
            </option>
          ))}
        </select>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Form */}
        <form
          onSubmit={save}
          className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          <div>
            <label className="block text-sm font-medium text-slate-700">
              Bot name
            </label>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className={field}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">
              Welcome message
            </label>
            <textarea
              value={form.welcome_message}
              onChange={(e) =>
                setForm({ ...form, welcome_message: e.target.value })
              }
              rows={2}
              className={field}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">
              Fallback message (shown when the answer isn&apos;t on the site)
            </label>
            <textarea
              value={form.fallback_message}
              onChange={(e) =>
                setForm({ ...form, fallback_message: e.target.value })
              }
              rows={2}
              className={field}
            />
          </div>

          <div className="flex gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700">
                Primary color
              </label>
              <input
                type="color"
                value={form.primary_color}
                onChange={(e) =>
                  setForm({ ...form, primary_color: e.target.value })
                }
                className="mt-1 h-10 w-16 cursor-pointer rounded border border-slate-300"
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-slate-700">
                Logo URL (optional)
              </label>
              <input
                value={form.logo_url}
                onChange={(e) => setForm({ ...form, logo_url: e.target.value })}
                placeholder="https://…/logo.png"
                className={field}
              />
            </div>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
          {saved && <p className="text-sm text-green-600">Saved!</p>}

          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-indigo-600 px-5 py-2 font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
        </form>

        {/* Live preview */}
        <div className="space-y-4">
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div
              className="flex items-center gap-3 p-4 text-white"
              style={{ backgroundColor: form.primary_color }}
            >
              {form.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={form.logo_url}
                  alt=""
                  className="h-8 w-8 rounded-full bg-white object-contain"
                />
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20">
                  💬
                </div>
              )}
              <span className="font-semibold">{form.name || "Assistant"}</span>
            </div>
            <div className="space-y-2 p-4">
              <div className="max-w-[80%] rounded-2xl rounded-tl-sm bg-slate-100 px-3 py-2 text-sm text-slate-700">
                {form.welcome_message || "Hello! How can I help?"}
              </div>
              <div
                className="ml-auto max-w-[80%] rounded-2xl rounded-tr-sm px-3 py-2 text-sm text-white"
                style={{ backgroundColor: form.primary_color }}
              >
                Example question
              </div>
            </div>
          </div>

          <EmbedSnippet botId={selected.id} appUrl={appUrl} />
        </div>
      </div>
    </div>
  );
}
