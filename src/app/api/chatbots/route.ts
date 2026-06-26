import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getStore } from "@/lib/store";

export const runtime = "nodejs";

// GET /api/chatbots[?websiteId=...]  — list chatbots.
export async function GET(request: Request) {
  if (!(await getSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const websiteId = new URL(request.url).searchParams.get("websiteId") || undefined;
  const chatbots = await getStore().listChatbots(websiteId);
  return NextResponse.json({ chatbots });
}

// POST /api/chatbots  { websiteId, name? }  — create an additional bot.
export async function POST(request: Request) {
  if (!(await getSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { websiteId, name } = await request.json().catch(() => ({}));
  if (!websiteId) {
    return NextResponse.json({ error: "websiteId is required" }, { status: 400 });
  }
  const patch = name ? { name } : undefined;
  const chatbot = await getStore().createChatbot(websiteId, patch);
  return NextResponse.json({ chatbot }, { status: 201 });
}
