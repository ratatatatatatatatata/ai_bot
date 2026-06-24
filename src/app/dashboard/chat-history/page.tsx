import { createClient } from "@/lib/supabase/server";
import ChatHistory from "@/components/ChatHistory";
import type { ChatMessage, Website } from "@/lib/types";

export default async function ChatHistoryPage() {
  const supabase = await createClient();

  const [{ data: messages }, { data: websites }] = await Promise.all([
    supabase
      .from("chat_messages")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200),
    supabase.from("websites").select("*"),
  ]);

  return (
    <ChatHistory
      websites={(websites as Website[]) ?? []}
      initialMessages={(messages as ChatMessage[]) ?? []}
    />
  );
}
