import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import PagesManager from "@/components/PagesManager";
import EmbedSnippet from "@/components/EmbedSnippet";
import type { Page } from "@/lib/types";

export default async function WebsiteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: website } = await supabase
    .from("websites")
    .select("*")
    .eq("id", id)
    .single();

  if (!website) notFound();

  const [{ data: pages }, { data: chatbot }] = await Promise.all([
    supabase
      .from("pages")
      .select("id, website_id, url, title, created_at")
      .eq("website_id", id)
      .order("created_at", { ascending: true }),
    supabase.from("chatbots").select("id").eq("website_id", id).single(),
  ]);

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/dashboard"
          className="text-sm text-slate-500 hover:text-slate-700"
        >
          ← All websites
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">
          {website.name || website.base_url}
        </h1>
        <a
          href={website.base_url}
          target="_blank"
          rel="noreferrer"
          className="text-sm text-indigo-600 hover:underline"
        >
          {website.base_url}
        </a>
      </div>

      <PagesManager websiteId={id} initialPages={(pages as Page[]) ?? []} />

      {chatbot && <EmbedSnippet botId={chatbot.id} appUrl={appUrl} />}
    </div>
  );
}
