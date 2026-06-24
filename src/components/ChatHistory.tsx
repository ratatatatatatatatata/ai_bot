"use client";

import { useState } from "react";
import type { ChatMessage, Website } from "@/lib/types";

export default function ChatHistory({
  websites,
  initialMessages,
}: {
  websites: Website[];
  initialMessages: ChatMessage[];
}) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [websiteId, setWebsiteId] = useState("");
  const [loading, setLoading] = useState(false);

  async function filter(id: string) {
    setWebsiteId(id);
    setLoading(true);
    const qs = id ? `?websiteId=${id}` : "";
    const res = await fetch(`/api/chat-history${qs}`);
    if (res.ok) setMessages((await res.json()).messages);
    setLoading(false);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Chat history</h1>
          <p className="text-sm text-slate-500">
            Questions asked through your embedded widgets.
          </p>
        </div>
        <select
          value={websiteId}
          onChange={(e) => filter(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="">All websites</option>
          {websites.map((w) => (
            <option key={w.id} value={w.id}>
              {w.name || w.base_url}
            </option>
          ))}
        </select>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        {loading ? (
          <p className="p-6 text-center text-slate-500">Loading…</p>
        ) : messages.length === 0 ? (
          <p className="p-6 text-center text-slate-500">No messages yet.</p>
        ) : (
          <ul className="space-y-3">
            {messages.map((m) => (
              <li
                key={m.id}
                className={`flex ${
                  m.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${
                    m.role === "user"
                      ? "rounded-tr-sm bg-indigo-600 text-white"
                      : "rounded-tl-sm bg-slate-100 text-slate-800"
                  }`}
                >
                  <p className="whitespace-pre-wrap">{m.message}</p>
                  {m.role === "assistant" &&
                    Array.isArray(m.sources) &&
                    m.sources.length > 0 && (
                      <div className="mt-2 space-y-1 border-t border-slate-200 pt-2">
                        {m.sources.map((s, i) => (
                          <a
                            key={i}
                            href={s.url}
                            target="_blank"
                            rel="noreferrer"
                            className="block truncate text-xs text-indigo-600 hover:underline"
                          >
                            🔗 {s.title}
                          </a>
                        ))}
                      </div>
                    )}
                  <p
                    className={`mt-1 text-[10px] ${
                      m.role === "user" ? "text-indigo-100" : "text-slate-400"
                    }`}
                  >
                    {new Date(m.created_at).toLocaleString()}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
