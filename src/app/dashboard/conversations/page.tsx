import { getStore } from "@/lib/store";
import ChatHistory from "@/components/ChatHistory";

export default async function ConversationsPage() {
  const store = getStore();
  const [messages, websites] = await Promise.all([
    store.listMessages({ limit: 200 }),
    store.listWebsites(),
  ]);
  return <ChatHistory websites={websites} initialMessages={messages} />;
}
