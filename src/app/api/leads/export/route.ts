import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getStore } from "@/lib/store";

export const runtime = "nodejs";

function csvCell(v: string | null): string {
  const s = (v ?? "").replace(/"/g, '""');
  return `"${s}"`;
}

// GET /api/leads/export[?websiteId=]  — download leads as CSV (admin only).
export async function GET(request: Request) {
  if (!(await getSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const websiteId = new URL(request.url).searchParams.get("websiteId") || undefined;
  const leads = await getStore().listLeads({ websiteId });

  const header = ["Name", "Email", "Phone", "Session", "Date"];
  const rows = leads.map((l) =>
    [l.name, l.email, l.phone, l.session_id, l.created_at].map(csvCell).join(",")
  );
  const csv = [header.map(csvCell).join(","), ...rows].join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="leads.csv"`,
    },
  });
}
