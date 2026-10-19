
import Parser from "rss-parser";
import crypto from "node:crypto";

const parser = new Parser({
  timeout: 12000,
  headers: { "User-Agent": "NewsCarouselBot/1.0" }
});

const normalize = value =>
  String(value || "")
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();

const tokenize = value =>
  new Set(
    normalize(value)
      .split(/\s+/)
      .filter(word => word.length > 2)
  );

function similarity(a, b) {
  const first = tokenize(a);
  const second = tokenize(b);

  if (!first.size || !second.size) return 0;

  const common = [...first].filter(word => second.has(word)).length;
  return common / (first.size + second.size - common);
}

function isSameStory(a, b) {
  if (normalize(a.title) === normalize(b.title)) return true;

  // Conservative headline matching to avoid merging unrelated stories.
  return similarity(a.title, b.title) >= 0.65;
}

function recencyScore(publishedAt) {
  const timestamp = Date.parse(publishedAt || "");

  if (!Number.isFinite(timestamp)) return 0;

  const ageHours = Math.max(0, (Date.now() - timestamp) / 3600000);

  if (ageHours <= 3) return 30;
  if (ageHours <= 12) return 24;
  if (ageHours <= 24) return 18;
  if (ageHours <= 48) return 10;
  if (ageHours <= 72) return 4;

  return 0;
}

async function readFeed(feedUrl, trending = false) {
  try {
    const feed = await parser.parseURL(feedUrl);

    return (feed.items || []).flatMap(item => {
      const title = (item.title || "").trim();
      const url = item.link || item.guid;

      if (!title || !url || !/^https?:\/\//i.test(url)) return [];

      const publishedAt = item.isoDate || item.pubDate || "";

      return [{
        id: crypto.createHash("sha256")
          .update(normalize(title))
          .digest("hex"),
        title,
        url,
        source: feed.title || new URL(feedUrl).hostname,
        publishedAt,
        summary: (item.contentSnippet || item.summary || "")
          .replace(/\s+/g, " ")
          .slice(0, 500),
        trending,
        popularityScore: 0,
        coverageCount: 1
      }];
    });
  } catch (error) {
    console.warn(`Feed failed: ${feedUrl} — ${error.message}`);
    return [];
  }
}

function groupRelatedStories(stories) {
  const groups = [];

  // Prefer recent stories when choosing the representative headline.
  const ordered = [...stories].sort(
    (a, b) => Date.parse(b.publishedAt || 0) -
              Date.parse(a.publishedAt || 0)
  );

  for (const story of ordered) {
    const group = groups.find(existing =>
      isSameStory(existing[0], story)
    );

    if (group) {
      group.push(story);
    } else {
      groups.push([story]);
    }
  }

  return groups.map(group => {
    const representative = { ...group[0] };
    const uniqueSources = new Set(group.map(item => item.source));

    representative.coverageCount = uniqueSources.size;
    representative.trending = group.some(item => item.trending);
    representative.sourceLinks = [
      ...new Set(group.map(item => item.url))
    ];

    return representative;
  });
}

function scoreStory(story) {
  const sourceScore = Math.min(story.coverageCount, 5) * 12;
  const trendingScore = story.trending ? 25 : 0;
  const freshnessScore = recencyScore(story.publishedAt);

  // Maximum is approximately 115 points.
  return sourceScore + trendingScore + freshnessScore;
}

export async function collectNews(limit = 5) {
  const feeds = (process.env.NEWS_FEEDS || "").split(",").map(s => s.trim()).filter(Boolean);
  const stories = [];
  for (const feedUrl of feeds) {
    try {
      const feed = await parser.parseURL(feedUrl);
      if (feeds.length === 0) {
  throw new Error("NEWS_FEEDS is empty. Configure the NEWS_FEEDS GitHub repository secret.");
}
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

  const [newsResults, trendingResults] = await Promise.all([
    Promise.all(feeds.map(url => readFeed(url))),
    Promise.all(trendingFeeds.map(url => readFeed(url, true)))
  ]);

  const candidates = [...newsResults, ...trendingResults].flat();

  // Remove duplicate URLs before clustering similar headlines.
  const uniqueUrls = new Set();
  const uniqueStories = candidates.filter(story => {
    if (uniqueUrls.has(story.url)) return false;
    uniqueUrls.add(story.url);
    return true;
  });

  const groups = groupRelatedStories(uniqueStories);

  return groups
    .map(story => ({
      ...story,
      popularityScore: scoreStory(story)
    }))
    .sort((a, b) =>
      b.popularityScore - a.popularityScore ||
      Date.parse(b.publishedAt || 0) -
      Date.parse(a.publishedAt || 0)
    )
    .slice(0, limit);
}
