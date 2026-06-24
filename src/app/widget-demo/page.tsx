"use client";

import { useEffect, useState } from "react";

/**
 * Quick test harness for the embeddable widget.
 * Open /widget-demo?botId=YOUR_BOT_ID to load the live widget on a blank page.
 */
export default function WidgetDemoPage() {
  const [botId, setBotId] = useState<string | null>(null);

  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("botId");
    setBotId(id);
    if (!id) return;

    const s = document.createElement("script");
    s.src = "/widget.js";
    s.setAttribute("data-bot-id", id);
    s.setAttribute("data-api", window.location.origin);
    s.defer = true;
    document.body.appendChild(s);

    return () => {
      s.remove();
      document.getElementById("wkb-host")?.remove();
    };
  }, []);

  return (
    <main className="mx-auto max-w-2xl px-6 py-20">
      <h1 className="text-2xl font-bold text-slate-900">Widget demo</h1>
      {botId ? (
        <p className="mt-3 text-slate-600">
          Loading the chatbot for bot <code>{botId}</code>. Look for the chat
          button in the bottom-right corner. ↘️
        </p>
      ) : (
        <p className="mt-3 text-slate-600">
          Add <code>?botId=YOUR_BOT_ID</code> to the URL to preview a chatbot.
          You can find the bot id in the dashboard under{" "}
          <strong>Customize bot</strong> or in the embed snippet.
        </p>
      )}
    </main>
  );
}
