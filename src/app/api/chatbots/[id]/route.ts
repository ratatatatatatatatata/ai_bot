import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getStore } from "@/lib/store";
import type { Chatbot } from "@/lib/types";

export const runtime = "nodejs";

const EDITABLE: (keyof Chatbot)[] = [
  "name",
  "status",
  "welcome_message",
  "primary_color",
  "theme",
  "position",
  "logo_url",
  "avatar_url",
  "launcher_text",
  "fallback_message",
  "suggested_questions",
  "language",
  "ai_provider",
  "ai_model",
  "temperature",
  "lead_capture",
  "lead_message",
];

// PATCH /api/chatbots/:id — update a bot's settings/appearance.
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await getSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const body = await request.json().catch(() => ({}));

  const patch: Record<string, unknown> = {};
  for (const key of EDITABLE) {
    if (key in body) patch[key] = body[key];
  }
  if ("temperature" in patch) patch.temperature = Number(patch.temperature);
  if ("lead_capture" in patch) patch.lead_capture = Boolean(patch.lead_capture);
  if ("suggested_questions" in patch && !Array.isArray(patch.suggested_questions)) {
    patch.suggested_questions = [];
  }
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "No editable fields" }, { status: 400 });
  }

  const chatbot = await getStore().updateChatbot(id, patch as Partial<Chatbot>);
  if (!chatbot) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ chatbot });
}

// DELETE /api/chatbots/:id — remove a bot.
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await getSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  await getStore().deleteChatbot(id);
  return NextResponse.json({ ok: true });
}
