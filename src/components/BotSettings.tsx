"use client";

import { useState } from "react";
import EmbedSnippet from "@/components/EmbedSnippet";
import { AI_MODELS, SUPPORTED_LANGUAGES } from "@/lib/config";
import type { Chatbot } from "@/lib/types";

export default function BotSettings({
  bot,
  appUrl,
}: {
  bot: Chatbot;
  appUrl: string;
}) {
  const [form, setForm] = useState<Chatbot>(bot);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof Chatbot>(key: K, value: Chatbot[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setSaved(false);
  }

  function setSuggested(i: number, value: string) {
    const next = [...form.suggested_questions];
    next[i] = value;
    set("suggested_questions", next);
  }
  function addSuggested() {
    set("suggested_questions", [...form.suggested_questions, ""]);
  }
  function removeSuggested(i: number) {
    set(
      "suggested_questions",
      form.suggested_questions.filter((_, idx) => idx !== i)
    );
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const payload = {
        ...form,
        suggested_questions: form.suggested_questions.map((s) => s.trim()).filter(Boolean),
      };
      const res = await fetch(`/api/chatbots/${bot.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Save failed");
      setSaved(true);
    } catch (e2) {
      setError(e2 instanceof Error ? e2.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  const field =
    "mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200";
  const label = "block text-sm font-medium text-slate-700";
  const card = "space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm";
  const models = AI_MODELS[form.ai_provider] || AI_MODELS.openai;
  const dark = form.theme === "dark";

  return (
    <form onSubmit={save} className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {/* Left: settings */}
      <div className="space-y-6">
        <div className={card}>
          <h2 className="font-semibold text-slate-900">General</h2>
          <div>
            <label className={label}>Bot name</label>
            <input value={form.name} onChange={(e) => set("name", e.target.value)} className={field} />
          </div>
          <div className="flex items-center gap-3">
            <label className={label}>Status</label>
            <button
              type="button"
              onClick={() => set("status", form.status === "active" ? "paused" : "active")}
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                form.status === "active" ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"
              }`}
            >
              {form.status}
            </button>
          </div>
          <div>
            <label className={label}>Welcome message</label>
            <textarea value={form.welcome_message} onChange={(e) => set("welcome_message", e.target.value)} rows={2} className={field} />
          </div>
          <div>
            <label className={label}>Fallback (when answer not found)</label>
            <textarea value={form.fallback_message} onChange={(e) => set("fallback_message", e.target.value)} rows={2} className={field} />
          </div>
          <div>
            <label className={label}>Launcher text</label>
            <input value={form.launcher_text ?? ""} onChange={(e) => set("launcher_text", e.target.value)} className={field} />
          </div>
        </div>

        <div className={card}>
          <h2 className="font-semibold text-slate-900">Appearance</h2>
          <div className="flex flex-wrap gap-4">
            <div>
              <label className={label}>Primary color</label>
              <input type="color" value={form.primary_color} onChange={(e) => set("primary_color", e.target.value)} className="mt-1 h-10 w-16 cursor-pointer rounded border border-slate-300" />
            </div>
            <div>
              <label className={label}>Theme</label>
              <select value={form.theme} onChange={(e) => set("theme", e.target.value as Chatbot["theme"])} className={field}>
                <option value="light">Light</option>
                <option value="dark">Dark</option>
                <option value="auto">Auto</option>
              </select>
            </div>
            <div>
              <label className={label}>Position</label>
              <select value={form.position} onChange={(e) => set("position", e.target.value as Chatbot["position"])} className={field}>
                <option value="right">Bottom right</option>
                <option value="left">Bottom left</option>
              </select>
            </div>
          </div>
          <div>
            <label className={label}>Logo URL (header)</label>
            <input value={form.logo_url ?? ""} onChange={(e) => set("logo_url", e.target.value)} placeholder="https://…/logo.png" className={field} />
          </div>
          <div>
            <label className={label}>Avatar URL (launcher)</label>
            <input value={form.avatar_url ?? ""} onChange={(e) => set("avatar_url", e.target.value)} placeholder="https://…/avatar.png" className={field} />
          </div>
        </div>

        <div className={card}>
          <h2 className="font-semibold text-slate-900">Suggested questions</h2>
          {form.suggested_questions.map((q, i) => (
            <div key={i} className="flex gap-2">
              <input value={q} onChange={(e) => setSuggested(i, e.target.value)} className={field} />
              <button type="button" onClick={() => removeSuggested(i)} className="mt-1 rounded-lg border border-red-200 px-3 text-sm text-red-600 hover:bg-red-50">✕</button>
            </div>
          ))}
          <button type="button" onClick={addSuggested} className="text-sm font-medium text-indigo-600 hover:text-indigo-700">+ Add question</button>
        </div>

        <div className={card}>
          <h2 className="font-semibold text-slate-900">AI &amp; language</h2>
          <div className="flex flex-wrap gap-4">
            <div className="flex-1">
              <label className={label}>Provider</label>
              <select
                value={form.ai_provider}
                onChange={(e) => {
                  const provider = e.target.value;
                  const list = AI_MODELS[provider] || AI_MODELS.openai;
                  setForm((f) => ({ ...f, ai_provider: provider, ai_model: list[0] }));
                  setSaved(false);
                }}
                className={field}
              >
                <option value="openai">OpenAI</option>
                <option value="gemini">Gemini</option>
              </select>
            </div>
            <div className="flex-1">
              <label className={label}>Model</label>
              <select value={form.ai_model} onChange={(e) => set("ai_model", e.target.value)} className={field}>
                {models.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className={label}>Temperature: {form.temperature.toFixed(1)}</label>
            <input type="range" min={0} max={1} step={0.1} value={form.temperature} onChange={(e) => set("temperature", Number(e.target.value))} className="mt-2 w-full" />
            <p className="text-xs text-slate-400">Lower = more factual & grounded. Recommended ≤ 0.3.</p>
          </div>
          <div>
            <label className={label}>Answer language</label>
            <select value={form.language} onChange={(e) => set("language", e.target.value)} className={field}>
              {SUPPORTED_LANGUAGES.map((l) => (
                <option key={l.code} value={l.code}>{l.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className={card}>
          <h2 className="font-semibold text-slate-900">Lead capture</h2>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" checked={form.lead_capture} onChange={(e) => set("lead_capture", e.target.checked)} />
            Ask visitors for their contact details
          </label>
          {form.lead_capture && (
            <div>
              <label className={label}>Lead prompt</label>
              <textarea value={form.lead_message} onChange={(e) => set("lead_message", e.target.value)} rows={2} className={field} />
            </div>
          )}
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
        {saved && <p className="text-sm text-green-600">Saved!</p>}
        <button type="submit" disabled={saving} className="rounded-lg bg-indigo-600 px-5 py-2.5 font-semibold text-white hover:bg-indigo-700 disabled:opacity-60">
          {saving ? "Saving…" : "Save changes"}
        </button>
      </div>

      {/* Right: preview + embed */}
      <div className="space-y-4 lg:sticky lg:top-6 lg:self-start">
        <div className="overflow-hidden rounded-2xl border border-slate-200 shadow-sm" style={{ background: dark ? "#0f172a" : "#fff" }}>
          <div className="flex items-center gap-3 p-4 text-white" style={{ backgroundColor: form.primary_color }}>
            {form.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={form.logo_url} alt="" className="h-8 w-8 rounded-full bg-white object-contain" />
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20">💬</div>
            )}
            <span className="font-semibold">{form.name || "Assistant"}</span>
          </div>
          <div className="space-y-2 p-4">
            <div className={`max-w-[80%] rounded-2xl rounded-tl-sm px-3 py-2 text-sm ${dark ? "bg-slate-800 text-slate-100" : "bg-slate-100 text-slate-700"}`}>
              {form.welcome_message || "Hello! How can I help?"}
            </div>
            <div className="ml-auto max-w-[80%] rounded-2xl rounded-tr-sm px-3 py-2 text-sm text-white" style={{ backgroundColor: form.primary_color }}>
              Example question
            </div>
            {form.suggested_questions.filter(Boolean).length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {form.suggested_questions.filter(Boolean).map((q, i) => (
                  <span key={i} className="rounded-full border px-3 py-1 text-xs" style={{ borderColor: form.primary_color, color: form.primary_color }}>{q}</span>
                ))}
              </div>
            )}
          </div>
        </div>

        <EmbedSnippet botId={bot.id} appUrl={appUrl} />
        <a href={`/widget-demo?botId=${bot.id}`} target="_blank" rel="noreferrer" className="block text-center text-sm font-medium text-indigo-600 hover:text-indigo-700">
          Open live preview ↗
        </a>
      </div>
    </form>
  );
}
