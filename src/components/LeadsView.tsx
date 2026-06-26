"use client";

import { useState } from "react";
import type { Lead, Website } from "@/lib/types";

export default function LeadsView({
  initialLeads,
  websites,
}: {
  initialLeads: Lead[];
  websites: Website[];
}) {
  const [leads, setLeads] = useState<Lead[]>(initialLeads);
  const [websiteId, setWebsiteId] = useState("");
  const [loading, setLoading] = useState(false);

  async function filter(id: string) {
    setWebsiteId(id);
    setLoading(true);
    const qs = id ? `?websiteId=${id}` : "";
    const res = await fetch(`/api/leads${qs}`);
    if (res.ok) setLeads((await res.json()).leads);
    setLoading(false);
  }

  const exportUrl = `/api/leads/export${websiteId ? `?websiteId=${websiteId}` : ""}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Leads</h1>
          <p className="text-sm text-slate-500">Contacts captured by your chatbots.</p>
        </div>
        <div className="flex gap-2">
          <select
            value={websiteId}
            onChange={(e) => filter(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">All knowledge bases</option>
            {websites.map((w) => (
              <option key={w.id} value={w.id}>{w.name || w.base_url}</option>
            ))}
          </select>
          <a
            href={exportUrl}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
          >
            Export CSV
          </a>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        {loading ? (
          <p className="p-6 text-center text-slate-500">Loading…</p>
        ) : leads.length === 0 ? (
          <p className="p-6 text-center text-slate-500">No leads yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-xs uppercase tracking-wide text-slate-400">
                  <th className="px-3 py-2">Name</th>
                  <th className="px-3 py-2">Email</th>
                  <th className="px-3 py-2">Phone</th>
                  <th className="px-3 py-2">Date</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((l) => (
                  <tr key={l.id} className="border-t border-slate-100">
                    <td className="px-3 py-2 text-slate-800">{l.name || "—"}</td>
                    <td className="px-3 py-2 text-slate-800">{l.email || "—"}</td>
                    <td className="px-3 py-2 text-slate-800">{l.phone || "—"}</td>
                    <td className="px-3 py-2 text-slate-500">{new Date(l.created_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
