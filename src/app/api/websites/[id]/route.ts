import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getStore } from "@/lib/store";

export const runtime = "nodejs";

// DELETE /api/websites/:id — remove a website and all its data.
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await getSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  await getStore().deleteWebsite(id);
  return NextResponse.json({ ok: true });
}
