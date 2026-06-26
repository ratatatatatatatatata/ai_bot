import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getStore } from "@/lib/store";
import { crawlSite } from "@/lib/crawler";
import { ingestPages } from "@/lib/ingest";

export const runtime = "nodejs";
export const maxDuration = 60;

// POST /api/crawl  { websiteId }
export async function POST(request: Request) {
  if (!(await getSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { websiteId } = await request.json().catch(() => ({}));
  if (!websiteId) {
    return NextResponse.json({ error: "websiteId is required" }, { status: 400 });
  }

  const store = getStore();
  const website = await store.getWebsite(websiteId);
  if (!website) {
    return NextResponse.json({ error: "Website not found" }, { status: 404 });
  }

  const maxPages = Number(process.env.CRAWL_MAX_PAGES || 40);
  await store.updateWebsite(websiteId, { status: "crawling", status_message: null });

  try {
    // Re-crawl: clear previously crawled pages (keep uploads / text / Q&A).
    await store.clearKnowledge(websiteId, ["crawl"]);

    const crawled = await crawlSite(website.base_url, maxPages);
    if (crawled.length === 0) {
      await store.updateWebsite(websiteId, {
        status: "error",
        status_message: "No readable pages were found.",
      });
      return NextResponse.json(
        { error: "No readable pages were found at that URL." },
        { status: 422 }
      );
    }

    const { chunks } = await ingestPages(
      store,
      websiteId,
      crawled.map((p) => ({ ...p, source: "crawl" as const }))
    );

    const pagesCount = (await store.listPages(websiteId)).length;
    await store.updateWebsite(websiteId, {
      status: "done",
      status_message: `Indexed ${crawled.length} pages, ${chunks} chunks.`,
      pages_count: pagesCount,
      last_crawled_at: new Date().toISOString(),
    });

    return NextResponse.json({ ok: true, pages: crawled.length, chunks });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Crawl failed";
    await store.updateWebsite(websiteId, { status: "error", status_message: message });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
