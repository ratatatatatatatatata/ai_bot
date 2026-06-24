import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { crawlSite } from "@/lib/crawler";
import { chunkText } from "@/lib/chunk";
import { embedTexts } from "@/lib/ai";

export const runtime = "nodejs";
export const maxDuration = 300; // allow long crawls on Vercel

// POST /api/crawl  { websiteId }
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { websiteId } = await request.json().catch(() => ({}));
  if (!websiteId) {
    return NextResponse.json({ error: "websiteId is required" }, { status: 400 });
  }

  // Verify ownership via RLS-protected client.
  const { data: website, error: wErr } = await supabase
    .from("websites")
    .select("*")
    .eq("id", websiteId)
    .single();

  if (wErr || !website) {
    return NextResponse.json({ error: "Website not found" }, { status: 404 });
  }

  const admin = createAdminClient();
  const maxPages = Number(process.env.CRAWL_MAX_PAGES || 40);

  await admin
    .from("websites")
    .update({ status: "crawling", status_message: null })
    .eq("id", websiteId);

  try {
    // Fresh crawl: clear previous content so re-crawls don't duplicate.
    await admin.from("chunks").delete().eq("website_id", websiteId);
    await admin.from("pages").delete().eq("website_id", websiteId);

    const pages = await crawlSite(website.base_url, maxPages);

    if (pages.length === 0) {
      await admin
        .from("websites")
        .update({
          status: "error",
          status_message: "No readable pages were found.",
          pages_count: 0,
        })
        .eq("id", websiteId);
      return NextResponse.json(
        { error: "No readable pages were found at that URL." },
        { status: 422 }
      );
    }

    let totalChunks = 0;

    for (const page of pages) {
      const { data: pageRow, error: pErr } = await admin
        .from("pages")
        .insert({
          website_id: websiteId,
          url: page.url,
          title: page.title,
          content: page.content,
        })
        .select()
        .single();

      if (pErr || !pageRow) continue;

      const chunks = chunkText(page.content);
      if (chunks.length === 0) continue;

      // Embed in batches to stay within request limits.
      const batchSize = 96;
      for (let i = 0; i < chunks.length; i += batchSize) {
        const batch = chunks.slice(i, i + batchSize);
        const embeddings = await embedTexts(batch);

        const rows = batch.map((text, j) => ({
          website_id: websiteId,
          page_id: pageRow.id,
          page_url: page.url,
          page_title: page.title,
          chunk_text: text,
          embedding: embeddings[j],
        }));

        const { error: cErr } = await admin.from("chunks").insert(rows);
        if (!cErr) totalChunks += rows.length;
      }
    }

    await admin
      .from("websites")
      .update({
        status: "done",
        status_message: `Indexed ${pages.length} pages, ${totalChunks} chunks.`,
        pages_count: pages.length,
        last_crawled_at: new Date().toISOString(),
      })
      .eq("id", websiteId);

    return NextResponse.json({
      ok: true,
      pages: pages.length,
      chunks: totalChunks,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Crawl failed";
    await admin
      .from("websites")
      .update({ status: "error", status_message: message })
      .eq("id", websiteId);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
