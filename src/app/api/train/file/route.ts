import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getStore } from "@/lib/store";
import { extractFromFile } from "@/lib/text/extract";
import { ingestPages } from "@/lib/ingest";

export const runtime = "nodejs";
export const maxDuration = 60;

// POST /api/train/file  (multipart: websiteId, file)
export async function POST(request: Request) {
  if (!(await getSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const form = await request.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "Expected form data" }, { status: 400 });

  const websiteId = String(form.get("websiteId") || "");
  const file = form.get("file");
  if (!websiteId || !(file instanceof File)) {
    return NextResponse.json({ error: "websiteId and file are required" }, { status: 400 });
  }

  const store = getStore();
  const website = await store.getWebsite(websiteId);
  if (!website) return NextResponse.json({ error: "Website not found" }, { status: 404 });

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const { title, text } = await extractFromFile(file.name, file.type, buffer);

    if (!text || text.trim().length < 20) {
      return NextResponse.json(
        { error: "No readable text found in the file." },
        { status: 422 }
      );
    }

    const { chunks } = await ingestPages(store, websiteId, [
      {
        url: `file://${encodeURIComponent(file.name)}`,
        title,
        content: text,
        source: "file",
      },
    ]);

    await store.createDoc({
      website_id: websiteId,
      name: file.name,
      type: file.type || "file",
      source: "file",
      chars: text.length,
    });

    const pagesCount = (await store.listPages(websiteId)).length;
    await store.updateWebsite(websiteId, { pages_count: pagesCount });

    return NextResponse.json({ ok: true, chunks, title });
  } catch (err) {
    const message = err instanceof Error ? err.message : "File processing failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
