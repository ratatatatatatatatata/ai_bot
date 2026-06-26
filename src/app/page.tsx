import Link from "next/link";
import { APP_NAME, isDemo } from "@/lib/config";

export default function HomePage() {
  const demo = isDemo();
  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col items-center justify-center px-6 py-16 text-center">
      <span className="mb-4 inline-flex items-center rounded-full bg-indigo-100 px-3 py-1 text-sm font-medium text-indigo-700">
        {APP_NAME}
      </span>

      <h1 className="max-w-3xl text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
        AI chatbots that answer only from{" "}
        <span className="text-indigo-600">your content</span>
      </h1>

      <p className="mt-6 max-w-2xl text-lg text-slate-600">
        Train a chatbot on your website, sitemap, files and custom Q&amp;A. Embed
        it anywhere with one script tag. If the answer isn&apos;t in your content,
        the bot says so — it never makes things up.
      </p>

      <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
        <Link
          href="/login"
          className="rounded-lg bg-indigo-600 px-6 py-3 font-semibold text-white shadow-sm transition hover:bg-indigo-700"
        >
          Admin sign in
        </Link>
        <Link
          href="/dashboard"
          className="rounded-lg border border-slate-300 bg-white px-6 py-3 font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          Go to dashboard
        </Link>
      </div>

      {demo && (
        <p className="mt-4 text-sm text-slate-500">
          Demo mode is on — sign in with{" "}
          <code className="rounded bg-slate-100 px-1">admin@tbplan.mn</code> /{" "}
          <code className="rounded bg-slate-100 px-1">Tbplan@2026</code>
        </p>
      )}

      <div className="mt-16 grid w-full grid-cols-1 gap-6 sm:grid-cols-4">
        {[
          { title: "Train", body: "Website crawl, sitemap, PDF/files, text & Q&A." },
          { title: "Customize", body: "Colors, dark mode, avatar, suggested questions." },
          { title: "Capture", body: "Collect leads and review every conversation." },
          { title: "Embed", body: "One script tag. Works on any website." },
        ].map((f) => (
          <div
            key={f.title}
            className="rounded-2xl border border-slate-200 bg-white p-6 text-left shadow-sm"
          >
            <h3 className="text-lg font-semibold text-slate-900">{f.title}</h3>
            <p className="mt-2 text-sm text-slate-600">{f.body}</p>
          </div>
        ))}
      </div>
    </main>
  );
}
