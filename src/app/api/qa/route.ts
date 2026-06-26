import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getStore } from "@/lib/store";

export const runtime = "nodejs";

// GET /api/qa?websiteId=...  — list custom Q&A pairs.
export async function GET(request: Request) {
  if (!(await getSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const websiteId = new URL(request.url).searchParams.get("websiteId");
  if (!websiteId) {
    return NextResponse.json({ error: "websiteId is required" }, { status: 400 });
  }
  const qa = await getStore().listQA(websiteId);
  return NextResponse.json({ qa });
}

// POST /api/qa  { websiteId, question, answer }
export async function POST(request: Request) {
  if (!(await getSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { websiteId, question, answer } = await request.json().catch(() => ({}));
  if (!websiteId || !question?.trim() || !answer?.trim()) {
    return NextResponse.json(
      { error: "websiteId, question and answer are required" },
      { status: 400 }
    );
  }
  const qa = await getStore().createQA({
    website_id: websiteId,
    question: question.trim(),
    answer: answer.trim(),
  });
  return NextResponse.json({ qa }, { status: 201 });
}
