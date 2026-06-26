// Shared application types.

export type WebsiteStatus = "idle" | "crawling" | "done" | "error";
export type SourceType = "crawl" | "sitemap" | "file" | "text";
export type BotStatus = "active" | "paused";
export type Theme = "light" | "dark" | "auto";
export type Position = "right" | "left";

export interface Website {
  id: string;
  user_id: string;
  name: string | null;
  base_url: string;
  status: WebsiteStatus;
  status_message: string | null;
  pages_count: number;
  last_crawled_at: string | null;
  created_at: string;
}

export interface Page {
  id: string;
  website_id: string;
  url: string;
  title: string | null;
  content: string | null;
  source: SourceType;
  created_at: string;
}

export interface Chunk {
  id: string;
  website_id: string;
  page_id: string;
  page_url: string;
  page_title: string;
  chunk_text: string;
  embedding: number[] | null;
  created_at: string;
}

export interface QAPair {
  id: string;
  website_id: string;
  question: string;
  answer: string;
  created_at: string;
}

export interface TrainingDoc {
  id: string;
  website_id: string;
  name: string;
  type: string; // mime / kind
  source: SourceType;
  chars: number;
  created_at: string;
}

export interface Chatbot {
  id: string;
  website_id: string;
  user_id: string;
  name: string;
  status: BotStatus;
  welcome_message: string;
  primary_color: string;
  theme: Theme;
  position: Position;
  logo_url: string | null;
  avatar_url: string | null;
  launcher_text: string | null;
  fallback_message: string;
  suggested_questions: string[];
  language: string; // "auto" | "mn" | "en" ...
  ai_provider: string; // "openai" | "gemini"
  ai_model: string;
  temperature: number;
  lead_capture: boolean;
  lead_message: string;
  created_at: string;
}

export interface ChatMessage {
  id: string;
  chatbot_id: string | null;
  website_id: string | null;
  session_id: string | null;
  role: "user" | "assistant";
  message: string;
  sources: Source[];
  created_at: string;
}

export interface Lead {
  id: string;
  chatbot_id: string | null;
  website_id: string | null;
  session_id: string | null;
  name: string | null;
  email: string | null;
  phone: string | null;
  created_at: string;
}

export interface Source {
  title: string;
  url: string;
}

// Public chatbot config returned to the embeddable widget.
export interface WidgetConfig {
  botId: string;
  name: string;
  status: BotStatus;
  welcomeMessage: string;
  primaryColor: string;
  theme: Theme;
  position: Position;
  logoUrl: string | null;
  avatarUrl: string | null;
  launcherText: string | null;
  fallbackMessage: string;
  suggestedQuestions: string[];
  leadCapture: boolean;
  leadMessage: string;
}

// A retrieved chunk + similarity score.
export interface MatchedChunk {
  id: string;
  page_url: string;
  page_title: string;
  chunk_text: string;
  similarity: number;
}

export interface Analytics {
  totalConversations: number;
  totalMessages: number;
  totalLeads: number;
  totalPages: number;
  topQuestions: { question: string; count: number }[];
  perDay: { date: string; count: number }[];
}
