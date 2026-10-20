
import Parser from "rss-parser";
import crypto from "node:crypto";

const parser = new Parser({
  timeout: 15000,
  headers: { "User-Agent": "IndiaDailyNewsBot/1.0" },
  customFields: {
    item: [
      ["media:content", "mediaContent", { keepArray: true }],
      ["media:thumbnail", "mediaThumbnail", { keepArray: true }],
      ["content:encoded", "contentEncoded"]
    ]
  }
});

const normalize = value =>
  String(value || "")
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();

function extractImage(item) {
  const candidates = [];

  if (item.enclosure?.url) {
    candidates.push(item.enclosure.url);
  }

  for (const media of item.mediaContent || []) {
    if (media?.$?.url) candidates.push(media.$.url);
    if (media?.url) candidates.push(media.url);
  }

  for (const media of item.mediaThumbnail || []) {
    if (media?.$?.url) candidates.push(media.$.url);
    if (media?.url) candidates.push(media.url);
  }

  const html = [
    item.content,
    item.contentEncoded,
    item.description,
    item.summary
  ].filter(Boolean).join(" ");

  const imageMatches = html.matchAll(
    /<img\b[^>]*\bsrc=["']([^"']+)["']/gi
  );

  for (const match of imageMatches) {
    candidates.push(match[1]);
  }

  return candidates.find(value => {
    if (typeof value !== "string") return false;

    try {
      return new URL(value).protocol === "https:";
    } catch {
      return false;
    }
  }) || "";
}

function getRecencyScore(publishedAt) {
  const timestamp = Date.parse(publishedAt || "");

  if (!Number.isFinite(timestamp)) return 0;

  const hours = (Date.now() - timestamp) / 3600000;

  if (hours < 0) return 0;
  if (hours <= 3) return 30;
  if (hours <= 12) return 24;
  if (hours <= 24) return 18;
  if (hours <= 48) return 10;
  if (hours <= 72) return 4;

  return 0;
}

function similarity(a, b) {
  const wordsA = new Set(normalize(a).split(" ").filter(Boolean));
  const wordsB = new Set(normalize(b).split(" ").filter(Boolean));

  if (!wordsA.size || !wordsB.size) return 0;

  const intersection = [...wordsA].filter(word => wordsB.has(word)).length;
  const union = new Set([...wordsA, ...wordsB]).size;

  return union ? intersection / union : 0;
}

function groupRelatedStories(stories) {
  const groups = [];

  for (const story of stories) {
    const group = groups.find(existing =>
      similarity(existing.title, story.title) >= 0.55
    );

    if (group) {
      group.related.push(story);
    } else {
      groups.push({
        title: story.title,
        related: [story]
      });
    }
  }

  return groups.map(group => {
    const related = group.related.sort((a, b) =>
      (Date.parse(b.publishedAt || "") || 0) -
      (Date.parse(a.publishedAt || "") || 0)
    );

    const representative = related[0];
    const sources = [
      ...new Set(related.map(story => story.source).filter(Boolean))
    ];

    // Prefer an available image from any related article.
    const imageStory = related.find(story => story.imageUrl);

    return {
      ...representative,
      imageUrl: imageStory?.imageUrl || "",
      coverageCount: sources.length,
      sourceLinks: related.map(story => ({
        source: story.source,
        url: story.url
      }))
    };
  });
}

function scoreStory(story) {
  const coverage = Math.min(story.coverageCount || 1, 5) * 12;
  const trending = story.trending ? 25 : 0;

  return coverage + trending + getRecencyScore(story.publishedAt);
}

async function readFeed(feedUrl, trending = false) {
  try {
    const feed = await parser.parseURL(feedUrl);
    const defaultSource = new URL(feedUrl).hostname.replace(/^www\./, "");

    return (feed.items || []).flatMap(item => {
      const title = (item.title || "").trim();
      const url = item.link || item.guid;

      if (!title || !url || !/^https?:\/\//i.test(url)) {
        return [];
      }

      const publishedAt = item.isoDate || item.pubDate || "";

      return [{
        id: crypto
          .createHash("sha256")
          .update(normalize(title))
          .digest("hex"),
        title,
        url,
        source: feed.title || defaultSource,
        publishedAt,
        summary: String(
          item.contentSnippet || item.summary || item.description || ""
        ).replace(/\s+/g, " ").slice(0, 500),
        imageUrl: extractImage(item),
        trending
      }];
    });
  } catch (error) {
    console.warn(`Feed failed: ${feedUrl} — ${error.message}`);
    return [];
  }
}

export async function collectNews(limit = 9) {
  const feeds = (process.env.NEWS_FEEDS || "")
    .split(",").map(value => value.trim()).filter(Boolean);

  const trendingFeeds = (process.env.TRENDING_FEEDS || "")
    .split(",").map(value => value.trim()).filter(Boolean);

  if (!feeds.length && !trendingFeeds.length) {
    throw new Error(
      "No news feeds configured. Set NEWS_FEEDS or TRENDING_FEEDS."
    );
  }

  const [newsResults, trendingResults] = await Promise.all([
    Promise.all(feeds.map(url => readFeed(url))),
    Promise.all(trendingFeeds.map(url => readFeed(url, true)))
  ]);

  const candidates = [...newsResults, ...trendingResults].flat();
  const uniqueUrls = new Set();

  const uniqueStories = candidates.filter(story => {
    const url = story.url.replace(/\/+$/, "");

    if (uniqueUrls.has(url)) return false;

    uniqueUrls.add(url);
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
      (Date.parse(b.publishedAt || "") || 0) -
      (Date.parse(a.publishedAt || "") || 0)
    )
    .slice(0, limit);
}
