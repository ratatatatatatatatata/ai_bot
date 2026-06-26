import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getStore } from "@/lib/store";

export const runtime = "nodejs";

// GET /api/pages?websiteId=...  — list indexed pages for a website.
export async function GET(request: Request) {
  if (!(await getSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const websiteId = new URL(request.url).searchParams.get("websiteId");
  if (!websiteId) {
    return NextResponse.json({ error: "websiteId is required" }, { status: 400 });
  }
  const pages = await getStore().listPages(websiteId);
  return NextResponse.json({ pages });
}
