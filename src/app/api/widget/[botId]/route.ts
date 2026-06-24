import { createAdminClient } from "@/lib/supabase/admin";
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
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("chatbots")
    .select("id, name, welcome_message, primary_color, logo_url, fallback_message")
    .eq("id", botId)
    .single();

  if (error || !data) {
    return corsJson({ error: "Chatbot not found" }, { status: 404 });
  }

  const config: WidgetConfig = {
    botId: data.id,
    name: data.name,
    welcomeMessage: data.welcome_message,
    primaryColor: data.primary_color,
    logoUrl: data.logo_url,
    fallbackMessage: data.fallback_message,
  };

  return corsJson(config);
}
