"use client";

import { useState } from "react";

export default function EmbedSnippet({
  botId,
  appUrl,
}: {
  botId: string;
  appUrl: string;
}) {
  const [copied, setCopied] = useState(false);
  const snippet = `<script src="${appUrl}/widget.js" data-bot-id="${botId}" data-api="${appUrl}" defer></script>`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(snippet);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard may be blocked; user can select manually */
    }
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-slate-900">Embed on your site</h2>
        <button
          onClick={copy}
          className="rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-slate-700"
        >
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
      <p className="mt-1 text-sm text-slate-500">
        Paste this one tag before <code>&lt;/body&gt;</code> on any website.
      </p>
      <pre className="mt-3 overflow-x-auto rounded-lg bg-slate-900 p-4 text-xs leading-relaxed text-slate-100">
        <code>{snippet}</code>
      </pre>
    </div>
  );
}
