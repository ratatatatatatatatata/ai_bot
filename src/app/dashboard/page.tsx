import Link from "next/link";
import { getStore } from "@/lib/store";

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-1 text-3xl font-bold text-slate-900">{value}</p>
    </div>
  );
}

export default async function OverviewPage() {
  const store = getStore();
  const [analytics, websites, chatbots] = await Promise.all([
    store.getAnalytics(),
    store.listWebsites(),
    store.listChatbots(),
  ]);

  const maxDay = Math.max(1, ...analytics.perDay.map((d) => d.count));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Overview</h1>
        <p className="text-sm text-slate-500">
          Your knowledge bases, bots and activity at a glance.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Conversations" value={analytics.totalConversations} />
        <StatCard label="Messages" value={analytics.totalMessages} />
        <StatCard label="Leads" value={analytics.totalLeads} />
        <StatCard label="Indexed pages" value={analytics.totalPages} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Activity chart */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
          <h2 className="font-semibold text-slate-900">Messages (last 14 days)</h2>
          <div className="mt-4 flex h-40 items-end gap-1">
            {analytics.perDay.map((d) => (
              <div key={d.date} className="flex flex-1 flex-col items-center gap-1" title={`${d.date}: ${d.count}`}>
                <div
                  className="w-full rounded-t bg-indigo-500/80"
                  style={{ height: `${(d.count / maxDay) * 100}%`, minHeight: d.count ? 4 : 0 }}
                />
              </div>
            ))}
          </div>
          <p className="mt-2 text-right text-xs text-slate-400">
            {analytics.perDay[0]?.date} → {analytics.perDay[analytics.perDay.length - 1]?.date}
          </p>
        </div>

        {/* Top questions */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="font-semibold text-slate-900">Top questions</h2>
          {analytics.topQuestions.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">No questions yet.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {analytics.topQuestions.map((q, i) => (
                <li key={i} className="flex items-center justify-between gap-2 text-sm">
                  <span className="truncate text-slate-700">{q.question}</span>
                  <span className="shrink-0 rounded-full bg-slate-100 px-2 text-xs text-slate-500">
                    {q.count}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <Link
          href="/dashboard/websites"
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
        >
          Manage knowledge ({websites.length})
        </Link>
        <Link
          href="/dashboard/chatbots"
          className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          Manage chatbots ({chatbots.length})
        </Link>
      </div>
    </div>
  );
}
