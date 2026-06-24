// Shared application types.

export type WebsiteStatus = "idle" | "crawling" | "done" | "error";

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
  created_at: string;
}

export interface Chatbot {
  id: string;
  website_id: string;
  user_id: string;
  name: string;
  welcome_message: string;
  primary_color: string;
  logo_url: string | null;
  fallback_message: string;
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

export interface Source {
  title: string;
  url: string;
}

// Public chatbot config returned to the embeddable widget.
export interface WidgetConfig {
  botId: string;
  name: string;
  welcomeMessage: string;
  primaryColor: string;
  logoUrl: string | null;
  fallbackMessage: string;
}

// A retrieved chunk + similarity score from match_chunks().
export interface MatchedChunk {
  id: string;
  page_url: string;
  page_title: string;
  chunk_text: string;
  similarity: number;
}
