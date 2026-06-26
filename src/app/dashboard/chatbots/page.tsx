import { getStore } from "@/lib/store";
import BotsManager from "@/components/BotsManager";

export default async function ChatbotsPage() {
  const store = getStore();
  const [chatbots, websites] = await Promise.all([
    store.listChatbots(),
    store.listWebsites(),
  ]);
  return <BotsManager initialBots={chatbots} websites={websites} />;
}
