import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getStore } from "@/lib/store";

export const runtime = "nodejs";

// GET /api/chat-history[?botId=&websiteId=&limit=]  — admin only.
export async function GET(request: Request) {
  if (!(await getSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const url = new URL(request.url);
  const messages = await getStore().listMessages({
    botId: url.searchParams.get("botId") || undefined,
    websiteId: url.searchParams.get("websiteId") || undefined,
    limit: Math.min(Number(url.searchParams.get("limit") || 200), 500),
  });
  return NextResponse.json({ messages });
}
