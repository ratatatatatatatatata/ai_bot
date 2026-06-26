// Parse a sitemap.xml (including sitemap index files) into a list of page URLs.

const USER_AGENT =
  "Mozilla/5.0 (compatible; TBPlanBot/1.0; +knowledge-base-crawler)";

async function fetchXml(url: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 15000);
    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT, Accept: "application/xml,text/xml" },
      signal: controller.signal,
    });
    clearTimeout(t);
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

function extractLocs(xml: string): string[] {
  const locs: string[] = [];
  const re = /<loc>\s*([^<\s]+)\s*<\/loc>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null) locs.push(m[1].trim());
  return locs;
}

/**
 * Returns up to `max` page URLs from a sitemap. If the sitemap is an index,
 * a few child sitemaps are fetched and merged.
 */
export async function fetchSitemapUrls(
  sitemapUrl: string,
  max = 50
): Promise<string[]> {
  const xml = await fetchXml(sitemapUrl);
  if (!xml) return [];

  const isIndex = /<sitemapindex/i.test(xml);
  if (isIndex) {
    const childSitemaps = extractLocs(xml).slice(0, 5);
    const all: string[] = [];
    for (const sm of childSitemaps) {
      const childXml = await fetchXml(sm);
      if (childXml) all.push(...extractLocs(childXml));
      if (all.length >= max) break;
    }
    return dedupe(all).slice(0, max);
  }

  return dedupe(extractLocs(xml)).slice(0, max);
}

function dedupe(urls: string[]): string[] {
  return [...new Set(urls.filter((u) => /^https?:\/\//i.test(u)))];
}
