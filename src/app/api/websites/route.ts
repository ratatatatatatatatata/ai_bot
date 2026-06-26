import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getStore } from "@/lib/store";

export const runtime = "nodejs";

// GET /api/websites — list websites.
export async function GET() {
  if (!(await getSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const websites = await getStore().listWebsites();
  return NextResponse.json({ websites });
}

// POST /api/websites — add a website (auto-creates its chatbot).
export async function POST(request: Request) {
  if (!(await getSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  let baseUrl: string = (body.base_url || "").trim();
  const name: string | undefined = body.name?.trim() || undefined;

  if (!baseUrl) {
    return NextResponse.json({ error: "base_url is required" }, { status: 400 });
  }
  if (!/^https?:\/\//i.test(baseUrl)) baseUrl = `https://${baseUrl}`;
  try {
    new URL(baseUrl);
  } catch {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  }

  const { website, chatbot } = await getStore().createWebsite({ name, base_url: baseUrl });
  return NextResponse.json({ website, chatbot }, { status: 201 });
}
