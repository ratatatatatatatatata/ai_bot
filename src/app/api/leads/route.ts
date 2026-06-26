import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getStore } from "@/lib/store";

export const runtime = "nodejs";

// GET /api/leads[?websiteId=&botId=]  — admin only.
export async function GET(request: Request) {
  if (!(await getSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const url = new URL(request.url);
  const leads = await getStore().listLeads({
    websiteId: url.searchParams.get("websiteId") || undefined,
    botId: url.searchParams.get("botId") || undefined,
  });
  return NextResponse.json({ leads });
}
