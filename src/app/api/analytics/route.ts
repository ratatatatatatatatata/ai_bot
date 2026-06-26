import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getStore } from "@/lib/store";

export const runtime = "nodejs";

// GET /api/analytics[?websiteId=]  — aggregate stats (admin only).
export async function GET(request: Request) {
  if (!(await getSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const websiteId = new URL(request.url).searchParams.get("websiteId") || undefined;
  const analytics = await getStore().getAnalytics(websiteId);
  return NextResponse.json({ analytics });
}
