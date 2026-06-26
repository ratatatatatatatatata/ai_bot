import * as cheerio from "cheerio";

export interface CrawledPage {
  url: string;
  title: string;
  content: string;
}

const USER_AGENT =
  "Mozilla/5.0 (compatible; WebsiteChatbotBot/1.0; +knowledge-base-crawler)";

// File extensions we never try to crawl as HTML.
const SKIP_EXT =
  /\.(pdf|docx?|xlsx?|pptx?|zip|rar|gz|tar|png|jpe?g|gif|svg|webp|ico|mp4|mp3|wav|avi|mov|css|js|json|xml|rss|woff2?|ttf|eot)(\?.*)?$/i;

/**
 * Crawl all reachable same-origin pages starting from `baseUrl`.
 * BFS, polite (sequential + small delay), respects a basic robots.txt.
 */
export async function crawlSite(
  baseUrl: string,
  maxPages = 40
): Promise<CrawledPage[]> {
  const start = normalizeUrl(baseUrl, baseUrl);
  if (!start) throw new Error(`Invalid start URL: ${baseUrl}`);

  const origin = new URL(start).origin;
  const disallow = await fetchRobotsDisallow(origin);

  const queue: string[] = [start];
  const visited = new Set<string>([start]);
  const results: CrawledPage[] = [];

  while (queue.length > 0 && results.length < maxPages) {
    const url = queue.shift()!;

    if (isDisallowed(url, disallow)) continue;

    const html = await fetchHtml(url);
    if (!html) continue;

    const $ = cheerio.load(html);
    const { title, content } = extractContent($);

    if (content && content.length > 50) {
      results.push({ url, title, content });
    }

    // Discover new same-origin links.
    $("a[href]").each((_, el) => {
      const href = $(el).attr("href");
      const next = normalizeUrl(href, url);
      if (
        next &&
        next.startsWith(origin) &&
        !visited.has(next) &&
        !SKIP_EXT.test(next)
      ) {
        visited.add(next);
        queue.push(next);
      }
    });

    // Be polite.
    await sleep(250);
  }

  return results;
}

/** Fetch a single URL and return its cleaned content (used by sitemap import). */
export async function fetchPageContent(url: string): Promise<CrawledPage | null> {
  const html = await fetchHtml(url);
  if (!html) return null;
  const $ = cheerio.load(html);
  const { title, content } = extractContent($);
  if (!content || content.length < 50) return null;
  return { url, title, content };
}

/** Extract a clean title + body text, stripping chrome and non-content nodes. */
export function extractContent($: cheerio.CheerioAPI): {
  title: string;
  content: string;
} {
  // Remove everything that is not real page content.
  $(
    "script, style, noscript, svg, iframe, form, nav, header, footer, aside, " +
      "[role=navigation], [role=banner], [role=contentinfo], .nav, .navbar, " +
      ".menu, .sidebar, .footer, .header, .cookie, .cookies, #nav, #footer, " +
      "#header, #sidebar"
  ).remove();

  const title =
    $("title").first().text().trim() ||
    $("h1").first().text().trim() ||
    "Untitled";

  // Prefer the main content region when present.
  const root = $("main").length
    ? $("main")
    : $("article").length
      ? $("article")
      : $("body");

  const raw = root.text();
  const content = normalizeText(raw);

  return { title, content };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function fetchHtml(url: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT, Accept: "text/html" },
      redirect: "follow",
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) return null;
    const type = res.headers.get("content-type") || "";
    if (!type.includes("text/html")) return null;

    return await res.text();
  } catch {
    return null;
  }
}

/** Normalize a possibly-relative href into an absolute, hash-free URL. */
export function normalizeUrl(
  href: string | undefined | null,
  base: string
): string | null {
  if (!href) return null;
  const trimmed = href.trim();
  if (
    !trimmed ||
    trimmed.startsWith("#") ||
    trimmed.startsWith("mailto:") ||
    trimmed.startsWith("tel:") ||
    trimmed.startsWith("javascript:")
  ) {
    return null;
  }

  try {
    const u = new URL(trimmed, base);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    u.hash = "";
    // Drop trailing slash (except root) for stable de-duplication.
    let out = u.toString();
    if (out.endsWith("/") && u.pathname !== "/") out = out.slice(0, -1);
    return out;
  } catch {
    return null;
  }
}

function normalizeText(text: string): string {
  return text
    .replace(/\r/g, "")
    .replace(/[ \t\f\v]+/g, " ")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .join("\n")
    .trim();
}

async function fetchRobotsDisallow(origin: string): Promise<string[]> {
  try {
    const res = await fetch(`${origin}/robots.txt`, {
      headers: { "User-Agent": USER_AGENT },
    });
    if (!res.ok) return [];
    const text = await res.text();

    const disallow: string[] = [];
    let appliesToUs = false;
    for (const lineRaw of text.split("\n")) {
      const line = lineRaw.split("#")[0].trim();
      if (!line) continue;
      const [keyRaw, ...rest] = line.split(":");
      const key = keyRaw.trim().toLowerCase();
      const value = rest.join(":").trim();
      if (key === "user-agent") {
        appliesToUs = value === "*";
      } else if (key === "disallow" && appliesToUs && value) {
        disallow.push(value);
      }
    }
    return disallow;
  } catch {
    return [];
  }
}

function isDisallowed(url: string, disallow: string[]): boolean {
  if (disallow.length === 0) return false;
  try {
    const path = new URL(url).pathname;
    return disallow.some((rule) => rule !== "/" && path.startsWith(rule));
  } catch {
    return false;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
