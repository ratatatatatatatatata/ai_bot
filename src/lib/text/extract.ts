import * as cheerio from "cheerio";

export interface ExtractResult {
  title: string;
  text: string;
}

/**
 * Extract plain text from an uploaded file buffer.
 * Supports PDF, HTML, and plain-text formats (txt, md, csv, json).
 */
export async function extractFromFile(
  filename: string,
  mime: string,
  buffer: Buffer
): Promise<ExtractResult> {
  const lower = filename.toLowerCase();
  const isPdf = mime.includes("pdf") || lower.endsWith(".pdf");
  const isHtml = mime.includes("html") || lower.endsWith(".html") || lower.endsWith(".htm");

  if (isPdf) {
    const text = await extractPdf(buffer);
    return { title: filename, text: clean(text) };
  }

  if (isHtml) {
    const $ = cheerio.load(buffer.toString("utf8"));
    $("script, style, noscript, svg, nav, header, footer").remove();
    return { title: $("title").first().text().trim() || filename, text: clean($("body").text()) };
  }

  // Plain text / markdown / csv / json
  return { title: filename, text: clean(buffer.toString("utf8")) };
}

async function extractPdf(buffer: Buffer): Promise<string> {
  try {
    // Import the library implementation directly to avoid the package's
    // debug entrypoint that reads a sample file when run as main.
    const mod = await import("pdf-parse/lib/pdf-parse.js");
    const pdfParse = (mod.default || mod) as (b: Buffer) => Promise<{ text: string }>;
    const data = await pdfParse(buffer);
    return data.text || "";
  } catch (err) {
    throw new Error(
      "Could not read this PDF. Try a text-based (non-scanned) PDF. " +
        (err instanceof Error ? err.message : "")
    );
  }
}

function clean(text: string): string {
  return text
    .replace(/\r/g, "")
    .replace(/[ \t\f\v]+/g, " ")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
