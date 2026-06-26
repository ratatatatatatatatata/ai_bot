import { notFound } from "next/navigation";
import Link from "next/link";
import { getStore } from "@/lib/store";
import BotSettings from "@/components/BotSettings";

export default async function ChatbotDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const bot = await getStore().getChatbot(id);
  if (!bot) notFound();

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  return (
    <div className="space-y-6">
      <div>
        <Link href="/dashboard/chatbots" className="text-sm text-slate-500 hover:text-slate-700">
          ← All chatbots
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">{bot.name}</h1>
      </div>
      <BotSettings bot={bot} appUrl={appUrl} />
    </div>
  );
}
