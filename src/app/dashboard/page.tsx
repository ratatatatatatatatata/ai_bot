import { createClient } from "@/lib/supabase/server";
import WebsitesManager from "@/components/WebsitesManager";
import type { Website } from "@/lib/types";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("websites")
    .select("*")
    .order("created_at", { ascending: false });

  return <WebsitesManager initialWebsites={(data as Website[]) ?? []} />;
}
