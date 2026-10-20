
import "dotenv/config";
import fs from "node:fs/promises";
import path from "node:path";

import { collectNews } from "./news.js";
import { renderCarousel } from "./carousel.js";
import { publishCarousel } from "./instagram.js";

const NEWS_LIMIT = Number.parseInt(process.env.NEWS_LIMIT || "5", 10);
const OUTPUT_DIR = process.env.OUTPUT_DIR || "output";
const DRY_RUN = process.env.PUBLISH_TO_INSTAGRAM !== "true";

const normalize = value =>
  String(value || "")
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();

function deduplicateStories(stories) {
  const seenTitles = new Set();
  const seenUrls = new Set();

  return stories.filter(story => {
    const title = normalize(story.title);
    const url = String(story.url || "").trim().replace(/\/+$/, "");

    if (!title || !url || seenTitles.has(title) || seenUrls.has(url)) {
      return false;
    }

    seenTitles.add(title);
    seenUrls.add(url);

    return true;
  });
}

function createCaption() {
  const date = new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    dateStyle: "long"
  }).format(new Date());

  return [
    `Today's News Brief | ${date}`,
    "",
    "Your daily news roundup.",
    "Check each slide for its original source and read the full report.",
    "",
    "#DailyNews #NewsUpdate #DailyBrief #CurrentAffairs"
  ].join("\n");
}

async function sendFailureAlert(message) {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;

  if (!webhookUrl) return;

  try {
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        content: `Instagram news automation failed: ${message}`.slice(0, 1900)
      }),
      signal: AbortSignal.timeout(10000)
    });
  } catch (error) {
    console.error("Failed to send Discord alert:", error.message);
  }
}

async function main() {
  if (!Number.isInteger(NEWS_LIMIT) || NEWS_LIMIT < 2 || NEWS_LIMIT > 15) {
    throw new Error("NEWS_LIMIT must be a number between 2 and 10.");
  }

  console.log("Starting daily news automation.");
  console.log(`Mode: ${DRY_RUN ? "DRY RUN" : "LIVE PUBLISHING"}`);

  // All story data stays in memory for this run.
  const fetchedStories = await collectNews(NEWS_LIMIT * 3);
  const stories = deduplicateStories(fetchedStories).slice(0, NEWS_LIMIT);

  if (stories.length < 2) {
    throw new Error(
      `Only ${stories.length} unique stories found. At least 2 are required.`
    );
  }

  console.log(`Selected ${stories.length} unique stories.`);

  await fs.mkdir(OUTPUT_DIR, { recursive: true });

  // Render the carousel to temporary runner storage.
  const imagePaths = await renderCarousel(stories, OUTPUT_DIR);

  // if (imagePaths.length !== stories.length) {
  //   throw new Error(
  //     `Expected ${stories.length} slides but rendered ${imagePaths.length}.`
  //   );
  // }

  console.log(`Rendered ${imagePaths.length} slides.`);

  if (DRY_RUN) {
    console.log("Dry run complete. Instagram publishing was skipped.");
    console.log("Generated image files:", imagePaths);
    return;
  }

  // Meta cannot access local files. These must be publicly accessible HTTPS URLs.
  const imageUrls = (process.env.PUBLIC_IMAGE_URLS || "")
    .split(",")
    .map(url => url.trim())
    .filter(Boolean);

  if (
    imageUrls.length !== imagePaths.length ||
    imageUrls.some(url => {
      try {
        return new URL(url).protocol !== "https:";
      } catch {
        return true;
      }
    })
  ) {
    throw new Error(
      `Live publishing requires ${imagePaths.length} public HTTPS URLs in ` +
      "PUBLIC_IMAGE_URLS, in the same order as the rendered slides. " +
      "Configure image hosting before enabling publishing."
    );
  }

  const caption = createCaption();
  const result = await publishCarousel(imageUrls, caption);

  console.log("Instagram carousel published successfully.");
  console.log("Meta publication result:", JSON.stringify(result));
}

try {
  await main();
} catch (error) {
  console.error("News automation failed:", error.stack || error.message);
  await sendFailureAlert(error.message);
  process.exitCode = 1;
}
