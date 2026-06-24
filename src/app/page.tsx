import Link from "next/link";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col items-center justify-center px-6 py-16 text-center">
      <span className="mb-4 inline-flex items-center rounded-full bg-indigo-100 px-3 py-1 text-sm font-medium text-indigo-700">
        Website-grounded AI
      </span>

      <h1 className="max-w-3xl text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
        A chatbot that answers only from{" "}
        <span className="text-indigo-600">your website</span>
      </h1>

      <p className="mt-6 max-w-2xl text-lg text-slate-600">
        Crawl any website, build a knowledge base from its real content, and
        embed a chat widget with one script tag. If the answer isn&apos;t on the
        site, the bot says so — it never makes things up.
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

      <div className="mt-16 grid w-full grid-cols-1 gap-6 sm:grid-cols-3">
        {[
          {
            title: "Crawl",
            body: "Enter a URL. We fetch public pages and extract clean text — no nav, footers or scripts.",
          },
          {
            title: "Embed",
            body: "Text is chunked and stored as vectors in Supabase for fast semantic search.",
          },
          {
            title: "Answer",
            body: "The bot retrieves matching chunks and answers strictly from them, with sources.",
          },
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
