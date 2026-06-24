import { createClient } from "@/lib/supabase/server";
import SettingsForm from "@/components/SettingsForm";
import type { Chatbot, Website } from "@/lib/types";

export default async function SettingsPage() {
  const supabase = await createClient();

  const [{ data: chatbots }, { data: websites }] = await Promise.all([
    supabase.from("chatbots").select("*").order("created_at", { ascending: true }),
    supabase.from("websites").select("*"),
  ]);

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  return (
    <SettingsForm
      chatbots={(chatbots as Chatbot[]) ?? []}
      websites={(websites as Website[]) ?? []}
      appUrl={appUrl}
    />
  );
}
