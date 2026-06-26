import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getStore } from "@/lib/store";

export const runtime = "nodejs";

// DELETE /api/pages/:id — delete one indexed page (and its chunks).
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await getSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  await getStore().deletePage(id);
  return NextResponse.json({ ok: true });
}
