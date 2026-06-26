import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { APP_SHORT } from "@/lib/config";
import NavLinks from "@/components/NavLinks";
import LogoutButton from "@/components/LogoutButton";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 md:flex-row">
        <aside className="w-full shrink-0 md:w-60">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:sticky md:top-6">
            <Link
              href="/dashboard"
              className="flex items-center gap-2 px-2 text-lg font-bold text-slate-900"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 text-sm text-white">
                T
              </span>
              {APP_SHORT}
            </Link>
            <div className="mt-6">
              <NavLinks />
            </div>
            <div className="mt-6 border-t border-slate-100 pt-4">
              <p className="truncate px-2 text-xs text-slate-400">{session.email}</p>
              <div className="mt-2 px-2">
                <LogoutButton />
              </div>
            </div>
          </div>
        </aside>

        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
