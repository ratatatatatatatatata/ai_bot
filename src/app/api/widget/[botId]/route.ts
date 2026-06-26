import { getStore } from "@/lib/store";
import { corsJson, preflight } from "@/lib/cors";
import type { WidgetConfig } from "@/lib/types";

export const runtime = "nodejs";

export async function OPTIONS() {
  return preflight();
}

// GET /api/widget/:botId — public chatbot config used by the embed script.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ botId: string }> }
) {
  const { botId } = await params;
  const bot = await getStore().getChatbot(botId);
  if (!bot) return corsJson({ error: "Chatbot not found" }, { status: 404 });

  const config: WidgetConfig = {
    botId: bot.id,
    name: bot.name,
    status: bot.status,
    welcomeMessage: bot.welcome_message,
    primaryColor: bot.primary_color,
    theme: bot.theme,
    position: bot.position,
    logoUrl: bot.logo_url,
    avatarUrl: bot.avatar_url,
    launcherText: bot.launcher_text,
    fallbackMessage: bot.fallback_message,
    suggestedQuestions: bot.suggested_questions || [],
    leadCapture: bot.lead_capture,
    leadMessage: bot.lead_message,
  };
  return corsJson(config);
}
