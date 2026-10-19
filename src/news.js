import Parser from "rss-parser";
import crypto from "node:crypto";
const parser = new Parser({ timeout: 12000, headers: { "User-Agent": "NewsCarouselBot/1.0" } });
const normalize = s => (s || "").toLowerCase().replace(/https?:\/\/\S+/g, "").replace(/[^\p{L}\p{N}]+/gu, " ").trim();

export async function collectNews(limit = 5) {
  const feeds = (process.env.NEWS_FEEDS || "").split(",").map(s => s.trim()).filter(Boolean);
  const stories = [];
  for (const feedUrl of feeds) {
    try {
      const feed = await parser.parseURL(feedUrl);
      for (const item of feed.items || []) {
        const title = (item.title || "").trim(), url = item.link || item.guid;
        if (!title || !url || !/^https?:\/\//i.test(url)) continue;
        stories.push({
          id: crypto.createHash("sha256").update(normalize(title)).digest("hex"),
          title, url, source: feed.title || new URL(feedUrl).hostname,
          publishedAt: item.isoDate || item.pubDate || "",
          summary: (item.contentSnippet || item.summary || "").replace(/\s+/g, " ").slice(0, 500)
        });
      }
    } catch (e) { console.warn(`Feed failed: ${feedUrl} — ${e.message}`); }
  }
  const seen = new Set();
  return stories.filter(s => {
    const key = normalize(s.title);
    if (seen.has(key)) return false;
    seen.add(key); return true;
  }).sort((a,b) => Date.parse(b.publishedAt || 0) - Date.parse(a.publishedAt || 0)).slice(0, limit);
}
