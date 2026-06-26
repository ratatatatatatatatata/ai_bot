import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getStore } from "@/lib/store";
import { ingestPages } from "@/lib/ingest";

export const runtime = "nodejs";

// POST /api/train/text  { websiteId, title, text }
export async function POST(request: Request) {
  if (!(await getSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { websiteId, title, text } = await request.json().catch(() => ({}));
  if (!websiteId || !text || !String(text).trim()) {
    return NextResponse.json({ error: "websiteId and text are required" }, { status: 400 });
  }

  const store = getStore();
  const website = await store.getWebsite(websiteId);
  if (!website) return NextResponse.json({ error: "Website not found" }, { status: 404 });

  const name = (title && String(title).trim()) || "Manual text";
  const content = String(text);

  const { chunks } = await ingestPages(store, websiteId, [
    {
      url: `manual://${encodeURIComponent(name)}-${Date.now()}`,
      title: name,
      content,
      source: "text",
    },
  ]);

  await store.createDoc({
    website_id: websiteId,
    name,
    type: "text",
    source: "text",
    chars: content.length,
  });

  const pagesCount = (await store.listPages(websiteId)).length;
  await store.updateWebsite(websiteId, { pages_count: pagesCount });

  return NextResponse.json({ ok: true, chunks });
}
