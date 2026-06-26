import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getStore } from "@/lib/store";
import { fetchSitemapUrls } from "@/lib/sitemap";
import { fetchPageContent } from "@/lib/crawler";
import { ingestPages } from "@/lib/ingest";

export const runtime = "nodejs";
export const maxDuration = 60;

// POST /api/train/sitemap  { websiteId, sitemapUrl }
export async function POST(request: Request) {
  if (!(await getSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { websiteId, sitemapUrl } = await request.json().catch(() => ({}));
  if (!websiteId || !sitemapUrl) {
    return NextResponse.json(
      { error: "websiteId and sitemapUrl are required" },
      { status: 400 }
    );
  }

  const store = getStore();
  const website = await store.getWebsite(websiteId);
  if (!website) return NextResponse.json({ error: "Website not found" }, { status: 404 });

  const maxPages = Number(process.env.CRAWL_MAX_PAGES || 40);

  try {
    const urls = await fetchSitemapUrls(sitemapUrl, maxPages);
    if (urls.length === 0) {
      return NextResponse.json({ error: "No URLs found in sitemap." }, { status: 422 });
    }

    await store.clearKnowledge(websiteId, ["sitemap"]);

    const pages = [];
    for (const url of urls) {
      const page = await fetchPageContent(url);
      if (page) pages.push({ ...page, source: "sitemap" as const });
    }
    if (pages.length === 0) {
      return NextResponse.json({ error: "Could not read any sitemap pages." }, { status: 422 });
    }

    const { chunks } = await ingestPages(store, websiteId, pages);
    const pagesCount = (await store.listPages(websiteId)).length;
    await store.updateWebsite(websiteId, {
      status: "done",
      status_message: `Imported ${pages.length} pages from sitemap.`,
      pages_count: pagesCount,
      last_crawled_at: new Date().toISOString(),
    });

    return NextResponse.json({ ok: true, pages: pages.length, chunks });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Sitemap import failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
