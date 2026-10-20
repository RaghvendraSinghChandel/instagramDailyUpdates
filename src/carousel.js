
import { chromium } from "playwright";
import fs from "node:fs/promises";
import path from "node:path";

const WIDTH = 1080;
const HEIGHT = 1350;

const THEMES = {
  POLITICS: { label: "POLITICS", accent: "#E63946" },
  BUSINESS: { label: "BUSINESS", accent: "#00B887" },
  TECHNOLOGY: { label: "TECHNOLOGY", accent: "#7C3AED" },
  SPORTS: { label: "SPORTS", accent: "#F97316" },
  INDIA: { label: "INDIA NEWS", accent: "#0796DB" },
};

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getTheme(story = {}) {
  const text = `${story.title || ""} ${story.summary || ""}`.toLowerCase();

  if (/election|government|minister|parliament|politic|modi|congress|bjp|court|policy/.test(text)) {
    return THEMES.POLITICS;
  }

  if (/business|market|stock|sensex|nifty|econom|bank|rupee|ipo|company|trade/.test(text)) {
    return THEMES.BUSINESS;
  }

  if (/technology|artificial intelligence|software|google|apple|microsoft|cyber|startup/.test(text)) {
    return THEMES.TECHNOLOGY;
  }

  if (/cricket|football|sport|match|tournament|ipl|player|team|olympic/.test(text)) {
    return THEMES.SPORTS;
  }

  return THEMES.INDIA;
}

function getImageUrl(story = {}) {
  const url = story.imageUrl || story.image || story.thumbnail || "";

  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" ? parsed.href : "";
  } catch {
    return "";
  }
}

function getDomain(url = "") {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "India Daily";
  }
}

function getDate() {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date()).toUpperCase();
}

function getSummary(story = {}) {
  const summary = String(story.summary || "").trim();

  if (!summary) {
    return "Here are the key details behind this latest development.";
  }

  return summary.length > 220
    ? `${summary.slice(0, 217).trimEnd()}...`
    : summary;
}

function getTagline(story = {}) {
  const text = `${story.title || ""} ${story.summary || ""}`.toLowerCase();

  if (/election|government|minister|parliament|politic/.test(text)) {
    return "Key debates ahead";
  }

  if (/market|stock|sensex|nifty|business|econom|ipo/.test(text)) {
    return "The numbers behind the headlines";
  }

  if (/technology|artificial intelligence|startup|software/.test(text)) {
    return "Tomorrow is being built today";
  }

  if (/cricket|football|sport|match|tournament/.test(text)) {
    return "The moments that move millions";
  }

  if (/rain|weather|flood|monsoon|storm/.test(text)) {
    return "Stay informed. Stay prepared.";
  }

  return "The story. The context. The impact.";
}


function imageMarkup(story = {}, extraClass = "") {
  const theme = getTheme(story);
  const imageUrl = getImageUrl(story);

  return `
    <div
      class="image-area ${extraClass}"
      style="--accent:${theme.accent}"
    >
      <div class="fallback-art">
        <div class="fallback-orb"></div>
        <div class="fallback-line"></div>
        <div class="fallback-label">INDIA DAILY</div>
        <div class="fallback-symbol">${escapeHtml(theme.label)}</div>
      </div>

      ${
        imageUrl
          ? `<img
               class="background-image"
               src="${escapeHtml(imageUrl)}"
               alt=""
               onerror="this.remove()"
             />`
          : ""
      }

      <div class="image-shade"></div>
    </div>
  `;
}

function categoryBadge(story = {}) {
  const theme = getTheme(story);

  return `
    <span class="category-badge" style="--accent:${theme.accent}">
      ${escapeHtml(theme.label)}
    </span>
  `;
}


function coverHtml(stories) {
  const lead = stories[0];
  const sideStories = stories.slice(1, 3);
  const bottomStories = stories.slice(3, 6);

  const sideCards = sideStories.map((story, index) => `
    <article class="side-card">
      ${imageMarkup(story)}

      <div class="side-card-content">
        ${categoryBadge(story)}

        <h2>${escapeHtml(story.title || "Latest news")}</h2>

        <div class="cover-card-footer">
          <span>STORY ${String(index + 2).padStart(2, "0")}</span>
          <span>EXPLORE ↗</span>
        </div>
      </div>
    </article>
  `).join("");

  const bottomCards = bottomStories.map((story, index) => `
    <article class="bottom-card">
      ${imageMarkup(story)}

      <div class="bottom-card-content">
        ${categoryBadge(story)}
        <h2>${escapeHtml(story.title || "Latest news")}</h2>
      </div>

      <span class="bottom-card-number">
        ${String(index + 4).padStart(2, "0")}
      </span>
    </article>
  `).join("");

  return `
    <main class="slide cover-slide">
      <div class="cover-ambient"></div>

      <header class="cover-top">
        <div class="brand-lockup cover-brand">
          <div class="brand-name">
            INDIA <span>DAILY</span>
          </div>

          <div class="brand-caption">
            <span class="flag-mark"></span>
            NEWS · INSIGHTS · IMPACT
          </div>
        </div>

        <div class="cover-date-group">
          <div class="date-pill">
            <span class="calendar-icon">▦</span>
            ${escapeHtml(getDate())}
          </div>

          <div class="edition-label">YOUR DAILY EDITION</div>
        </div>
      </header>

      <section class="cover-intro">
        <div class="cover-kicker">
          <span class="live-dot"></span>
          THE STORIES THAT MATTER
        </div>

        <h1>
          INDIA,
          <span>IN FOCUS.</span>
        </h1>

        <div class="cover-intro-bottom">
          <p>
            The biggest developments.
            <strong>The context behind them.</strong>
          </p>

          <div class="cover-edition-number">
            <span>DAILY</span>
            <strong>BRIEFING</strong>
          </div>
        </div>
      </section>

      <section class="cover-main">
        <article class="lead-card premium-lead">
          ${imageMarkup(lead, "lead-image")}

          <div class="lead-topline">
            <span class="lead-feature-label">
              <span class="feature-star">✦</span>
              TODAY'S TOP STORY
            </span>

            <span class="lead-index">01</span>
          </div>

          <div class="lead-content">
            ${categoryBadge(lead)}

            <h2>${escapeHtml(lead.title || "Today's top story")}</h2>

            <p>${escapeHtml(getSummary(lead))}</p>

            <div class="lead-bottom">
              <span>${escapeHtml(getDomain(lead.url))}</span>
              <span class="lead-read-more">READ THE STORY ↗</span>
            </div>
          </div>

          <div class="lead-decorative-number">01</div>
        </article>

        <div class="side-stories">
          ${sideCards}
        </div>
      </section>

      ${
        bottomStories.length
          ? `
            <section class="bottom-stories-section">
              <div class="bottom-section-heading">
                <span>MORE IN TODAY'S BRIEFING</span>
                <span class="section-heading-line"></span>
                <span>${String(bottomStories.length).padStart(2, "0")} STORIES</span>
              </div>

              <div class="bottom-stories">
                ${bottomCards}
              </div>
            </section>
          `
          : ""
      }

      <footer class="cover-footer premium-cover-footer">
        <div class="footer-brand">
          <span class="footer-brand-dot"></span>
          INDIA DAILY
        </div>

        <div class="footer-values">
          <span>NEWS</span>
          <span class="footer-separator">/</span>
          <span>CONTEXT</span>
          <span class="footer-separator">/</span>
          <span>CLARITY</span>
        </div>

        <div class="footer-swipe">
          SWIPE TO EXPLORE <span>→</span>
        </div>
      </footer>
    </main>
  `;
}

function storyHtml(story, index, total) {
  const theme = getTheme(story);

  return `
    <main class="slide story-slide">
      ${imageMarkup(story, "story-background")}

      <div class="story-header">
        <div class="brand-lockup small-brand">
          <div class="brand-name">
            INDIA <span>DAILY</span>
          </div>
          <div class="brand-caption">
            <span class="flag-mark"></span>
            NEWS · INSIGHTS · IMPACT
          </div>
        </div>

        <div class="story-meta">
          <div class="date-pill">${escapeHtml(getDate())}</div>
          <div class="slide-count">
            ${String(index + 1).padStart(2, "0")}/${String(total).padStart(2, "0")}
          </div>
        </div>
      </div>

      <section class="story-content">
        ${categoryBadge(story)}

        <h1>${escapeHtml(story.title || "Latest news update")}</h1>

        <div class="accent-rule" style="--accent:${theme.accent}"></div>

        <p class="story-summary">${escapeHtml(getSummary(story))}</p>

        <div class="story-highlight">
          <div class="highlight-heading">THE KEY TAKEAWAY</div>
          <p>${escapeHtml(getTagline(story))}</p>
        </div>

        <div class="story-source">
          <span>SOURCE</span>
          <strong>${escapeHtml(getDomain(story.url))}</strong>
          <span class="story-page">
            ${String(index + 1).padStart(2, "0")} / ${String(total).padStart(2, "0")}
          </span>
        </div>
      </section>

      <div class="story-bottom-brand">
        INDIA DAILY <span>·</span> NEWS THAT MATTERS
      </div>
    </main>
  `;
}


function getStyles() {
  return `
    * {
      box-sizing: border-box;
    }

    html,
    body {
      margin: 0;
      padding: 0;
      width: ${WIDTH}px;
      height: ${HEIGHT}px;
      overflow: hidden;
      background: #07101c;
      font-family: Arial, Helvetica, sans-serif;
    }

    .slide {
      position: relative;
      width: ${WIDTH}px;
      height: ${HEIGHT}px;
      overflow: hidden;
      background: #07101c;
      color: #fff;
      isolation: isolate;
    }

    /* Background images and fallback artwork */

    .image-area {
      position: absolute;
      inset: 0;
      overflow: hidden;
      background:
        radial-gradient(
          circle at 75% 28%,
          color-mix(in srgb, var(--accent) 55%, transparent),
          transparent 40%
        ),
        linear-gradient(145deg, #203a54, #101b2a 60%, #03070d);
    }

    .fallback-art {
      position: absolute;
      inset: 0;
      overflow: hidden;
      background:
        radial-gradient(
          circle at 75% 28%,
          color-mix(in srgb, var(--accent) 50%, transparent),
          transparent 42%
        ),
        linear-gradient(145deg, #203a54, #101b2a 60%, #03070d);
    }

    .fallback-orb {
      position: absolute;
      width: 440px;
      height: 440px;
      right: -120px;
      top: 100px;
      border-radius: 50%;
      border: 2px solid rgba(255, 255, 255, 0.18);
      box-shadow:
        0 0 0 35px rgba(255, 255, 255, 0.035),
        0 0 0 75px rgba(255, 255, 255, 0.025);
    }

    .fallback-line {
      position: absolute;
      width: 120%;
      height: 260px;
      left: -10%;
      bottom: 100px;
      transform: rotate(-13deg);
      background: linear-gradient(
        135deg,
        transparent 15%,
        color-mix(in srgb, var(--accent) 50%, transparent),
        transparent 75%
      );
    }

    .fallback-label {
      position: absolute;
      top: 36%;
      left: 7%;
      color: rgba(255, 255, 255, 0.09);
      font-size: 76px;
      font-weight: 900;
      letter-spacing: 6px;
      white-space: nowrap;
    }

    .fallback-symbol {
      position: absolute;
      right: 35px;
      bottom: 45px;
      max-width: 70%;
      color: rgba(255, 255, 255, 0.65);
      font-size: 19px;
      font-weight: 900;
      letter-spacing: 3px;
      text-align: right;
    }

    .background-image {
      position: absolute;
      inset: 0;
      z-index: 1;
      width: 100%;
      height: 100%;
      object-fit: cover;
      object-position: center;
    }

    .image-shade {
      position: absolute;
      inset: 0;
      z-index: 2;
      background: linear-gradient(
        to bottom,
        rgba(3, 8, 16, 0.18) 0%,
        rgba(3, 8, 16, 0.05) 25%,
        rgba(3, 8, 16, 0.28) 48%,
        rgba(3, 8, 16, 0.92) 100%
      );
      pointer-events: none;
    }

    /* Brand and date */

    .brand-lockup {
      display: inline-flex;
      flex-direction: column;
      gap: 4px;
      padding: 10px 14px;
      border: 1px solid rgba(255, 255, 255, 0.3);
      border-radius: 12px;
      background: rgba(3, 9, 18, 0.8);
      box-shadow: 0 5px 22px rgba(0, 0, 0, 0.18);
    }

    .brand-name {
      color: #fff;
      font-size: 33px;
      font-weight: 950;
      letter-spacing: -1px;
      line-height: 1;
    }

    .brand-name span {
      color: #ffb703;
    }

    .brand-caption {
      display: flex;
      align-items: center;
      gap: 8px;
      color: #f3f4f6;
      font-size: 10px;
      font-weight: 800;
      letter-spacing: 1px;
    }

    .flag-mark {
      display: inline-block;
      width: 24px;
      height: 10px;
      border-radius: 2px;
      background: linear-gradient(
        to bottom,
        #ff9933 0 33%,
        #fff 33% 66%,
        #138808 66% 100%
      );
    }

    .date-pill {
      padding: 12px 16px;
      border: 1px solid rgba(255, 255, 255, 0.5);
      border-radius: 30px;
      background: rgba(5, 15, 30, 0.75);
      color: #fff;
      font-size: 15px;
      font-weight: 800;
      white-space: nowrap;
    }

    /* Premium cover */

    .cover-slide {
      background:
        radial-gradient(
          ellipse at 75% 20%,
          rgba(35, 113, 189, 0.3),
          transparent 38%
        ),
        linear-gradient(150deg, #101f32 0%, #07101d 70%, #03070d 100%);
    }

    .cover-ambient {
      position: absolute;
      z-index: -1;
      top: -240px;
      right: -180px;
      width: 650px;
      height: 650px;
      border: 1px solid rgba(255, 183, 3, 0.16);
      border-radius: 50%;
      box-shadow:
        0 0 0 50px rgba(255, 255, 255, 0.018),
        0 0 0 105px rgba(255, 255, 255, 0.012);
      pointer-events: none;
    }

    .cover-top {
      position: absolute;
      z-index: 5;
      top: 30px;
      left: 34px;
      right: 34px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
    }

    .cover-brand {
      padding: 12px 16px;
      border-color: rgba(255, 255, 255, 0.24);
      background: rgba(4, 10, 20, 0.86);
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.26);
    }

    .cover-brand .brand-name {
      font-size: 37px;
      letter-spacing: -1.5px;
    }

    .cover-date-group {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 8px;
    }

    .cover-date-group .date-pill {
      padding: 13px 19px;
      border-color: rgba(255, 255, 255, 0.35);
      background: rgba(3, 10, 20, 0.72);
    }

    .edition-label {
      color: #c8d4e5;
      font-size: 10px;
      font-weight: 900;
      letter-spacing: 2px;
    }

    .cover-intro {
      position: absolute;
      z-index: 4;
      top: 150px;
      left: 42px;
      right: 42px;
    }

    .cover-kicker {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 13px;
      color: #ffcb61;
      font-size: 13px;
      font-weight: 900;
      letter-spacing: 2.8px;
    }

    .live-dot {
      width: 9px;
      height: 9px;
      border-radius: 50%;
      background: #ffb703;
      box-shadow: 0 0 15px rgba(255, 183, 3, 0.75);
    }

    .cover-intro h1 {
      margin: 0;
      font-size: 75px;
      font-weight: 950;
      line-height: 0.98;
      letter-spacing: -3px;
      text-shadow: 0 4px 24px rgba(0, 0, 0, 0.3);
    }

    .cover-intro h1 span {
      display: block;
      color: #ffbd36;
      text-shadow: 0 4px 30px rgba(255, 183, 3, 0.12);
    }

    .cover-intro-bottom {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 20px;
      margin-top: 15px;
    }

    .cover-intro-bottom > p {
      max-width: 670px;
      margin: 0;
      color: #dce5f1;
      font-size: 19px;
      line-height: 1.4;
    }

    .cover-intro-bottom > p strong {
      color: #fff;
    }

    .cover-edition-number {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 3px;
      color: #aab9cd;
      font-size: 10px;
      letter-spacing: 2px;
    }

    .cover-edition-number strong {
      color: #fff;
      font-size: 13px;
    }

    /* Main cover story grid */

    .cover-main {
      position: absolute;
      z-index: 3;
      top: 355px;
      left: 30px;
      right: 30px;
      height: 575px;
      display: grid;
      grid-template-columns: 1.65fr 1fr;
      gap: 18px;
    }

    .lead-card,
    .side-card,
    .bottom-card {
      position: relative;
      overflow: hidden;
      isolation: isolate;
      border: 1px solid rgba(255, 255, 255, 0.23);
      border-radius: 16px;
      background: #142337;
      box-shadow: 0 12px 30px rgba(0, 0, 0, 0.24);
    }

    .lead-card > .image-area,
    .side-card > .image-area,
    .bottom-card > .image-area {
      z-index: -2;
    }

    .lead-card .image-shade,
    .side-card .image-shade,
    .bottom-card .image-shade {
      background: linear-gradient(
        to bottom,
        rgba(0, 0, 0, 0.03) 0%,
        rgba(0, 0, 0, 0.1) 25%,
        rgba(0, 0, 0, 0.87) 100%
      );
    }

    .premium-lead {
      border-color: rgba(255, 255, 255, 0.32);
      border-radius: 20px;
      box-shadow:
        0 20px 50px rgba(0, 0, 0, 0.32),
        inset 0 0 0 1px rgba(255, 255, 255, 0.04);
    }

    .premium-lead > .image-area .image-shade {
      background: linear-gradient(
        to bottom,
        rgba(2, 7, 14, 0.08) 0%,
        rgba(2, 7, 14, 0.06) 24%,
        rgba(2, 7, 14, 0.54) 54%,
        rgba(2, 7, 14, 0.96) 100%
      );
    }

    .lead-topline {
      position: absolute;
      z-index: 4;
      top: 20px;
      left: 20px;
      right: 20px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .lead-feature-label {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 10px 13px;
      border: 1px solid rgba(255, 255, 255, 0.3);
      border-radius: 6px;
      background: rgba(3, 9, 18, 0.77);
      color: #fff;
      font-size: 11px;
      font-weight: 900;
      letter-spacing: 1.2px;
    }

    .feature-star {
      color: #ffbd36;
      font-size: 17px;
    }

    .lead-index {
      color: rgba(255, 255, 255, 0.78);
      font-size: 19px;
      font-weight: 900;
      letter-spacing: 2px;
    }

    .lead-content {
      position: absolute;
      z-index: 3;
      left: 25px;
      right: 25px;
      bottom: 25px;
    }

    .premium-lead .lead-content {
      left: 25px;
      right: 25px;
      bottom: 24px;
    }

    .category-badge {
      display: inline-flex;
      width: fit-content;
      align-items: center;
      padding: 9px 13px;
      border-radius: 6px;
      background: var(--accent, #0796db);
      color: #fff;
      font-size: 13px;
      font-weight: 900;
      letter-spacing: 1.2px;
    }

    .lead-content h2 {
      margin: 18px 0 12px;
      color: #fff;
      font-size: 44px;
      font-weight: 950;
      letter-spacing: -1.4px;
      line-height: 1.06;
      overflow-wrap: anywhere;
      text-shadow: 0 3px 16px rgba(0, 0, 0, 0.8);
    }

    .premium-lead .lead-content h2 {
      margin-top: 15px;
      font-size: 43px;
      line-height: 1.04;
      letter-spacing: -1.4px;
    }

    .lead-content p {
      margin: 0;
      max-width: 96%;
      color: #f1f4f8;
      font-size: 19px;
      font-weight: 600;
      line-height: 1.4;
      text-shadow: 0 2px 12px rgba(0, 0, 0, 0.85);
    }

    .premium-lead .lead-content p {
      font-size: 18px;
      line-height: 1.38;
    }

    .lead-bottom {
      display: flex;
      justify-content: space-between;
      gap: 10px;
      margin-top: 17px;
      padding-top: 15px;
      border-top: 1px solid rgba(255, 255, 255, 0.35);
      color: #fff;
      font-size: 12px;
      font-weight: 900;
      letter-spacing: 1px;
    }

    .lead-read-more {
      color: #ffca55;
      font-size: 10px;
      letter-spacing: 1px;
    }

    .lead-decorative-number {
      position: absolute;
      z-index: -1;
      right: 15px;
      bottom: 110px;
      color: rgba(255, 255, 255, 0.055);
      font-size: 180px;
      line-height: 1;
      font-weight: 950;
      pointer-events: none;
    }

    .side-stories {
      display: grid;
      grid-template-rows: 1fr 1fr;
      gap: 18px;
      min-height: 0;
    }

    .side-card {
      border-color: rgba(255, 255, 255, 0.22);
      border-radius: 17px;
    }

    .side-card-content {
      position: absolute;
      z-index: 3;
      left: 17px;
      right: 17px;
      bottom: 17px;
    }

    .side-card .category-badge,
    .bottom-card .category-badge {
      padding: 7px 10px;
      font-size: 11px;
    }

    .side-card h2 {
      margin: 12px 0 0;
      color: #fff;
      font-size: 25px;
      font-weight: 950;
      line-height: 1.12;
      letter-spacing: -0.5px;
      overflow-wrap: anywhere;
      text-shadow: 0 3px 16px rgba(0, 0, 0, 0.8);
    }

    .cover-card-footer {
      display: flex;
      justify-content: space-between;
      gap: 8px;
      margin-top: 12px;
      padding-top: 10px;
      border-top: 1px solid rgba(255, 255, 255, 0.3);
      color: #e4ebf5;
      font-size: 9px;
      font-weight: 900;
      letter-spacing: 1px;
    }

    .cover-card-footer span:last-child {
      color: #ffca55;
    }

    /* Bottom row of stories */

    .bottom-stories-section {
      position: absolute;
      z-index: 3;
      top: 952px;
      left: 30px;
      right: 30px;
      height: 300px;
    }

    .bottom-section-heading {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 13px;
      color: #cbd7e7;
      font-size: 10px;
      font-weight: 900;
      letter-spacing: 1.5px;
    }

    .section-heading-line {
      flex: 1;
      height: 1px;
      background: rgba(255, 255, 255, 0.24);
    }

    .bottom-stories-section .bottom-stories {
      position: static;
      height: 260px;
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 15px;
    }

    .bottom-card {
      border-color: rgba(255, 255, 255, 0.22);
      border-radius: 14px;
    }

    .bottom-card-content {
      position: absolute;
      z-index: 3;
      left: 14px;
      right: 14px;
      bottom: 15px;
    }

    .bottom-card h2 {
      margin: 10px 0 0;
      color: #fff;
      font-size: 20px;
      font-weight: 950;
      line-height: 1.13;
      overflow-wrap: anywhere;
      text-shadow: 0 3px 16px rgba(0, 0, 0, 0.8);
    }

    .bottom-card-number {
      position: absolute;
      z-index: 3;
      top: 14px;
      right: 14px;
      padding: 6px 9px;
      border: 1px solid rgba(255, 255, 255, 0.24);
      border-radius: 5px;
      background: rgba(4, 10, 20, 0.8);
      color: #fff;
      font-size: 12px;
      font-weight: 900;
    }

    /* Cover footer */

    .cover-footer {
      position: absolute;
      z-index: 4;
      bottom: 19px;
      left: 35px;
      right: 35px;
      display: flex;
      justify-content: space-between;
      gap: 10px;
      padding-top: 14px;
      border-top: 1px solid rgba(255, 255, 255, 0.23);
      color: #f5f7fa;
      font-size: 12px;
      font-weight: 900;
      letter-spacing: 1.4px;
    }

    .premium-cover-footer {
      align-items: center;
      gap: 15px;
    }

    .footer-brand,
    .footer-values,
    .footer-swipe {
      display: flex;
      align-items: center;
      gap: 8px;
      white-space: nowrap;
    }

    .footer-brand {
      color: #fff;
      font-size: 11px;
      font-weight: 950;
      letter-spacing: 1.4px;
    }

    .footer-brand-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: #ffbd36;
    }

    .footer-values {
      flex: 1;
      justify-content: center;
      color: #d4deeb;
      font-size: 10px;
      letter-spacing: 1.2px;
    }

    .footer-separator {
      color: #ffbd36;
    }

    .footer-swipe {
      color: #fff;
      font-size: 10px;
      font-weight: 900;
      letter-spacing: 1px;
    }

    .footer-swipe span {
      color: #ffbd36;
      font-size: 17px;
    }

    /* Individual news slides */

    .story-header {
      position: absolute;
      z-index: 5;
      top: 32px;
      left: 32px;
      right: 32px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
    }

    .small-brand {
      padding: 9px 12px;
    }

    .small-brand .brand-name {
      font-size: 27px;
    }

    .small-brand .brand-caption {
      font-size: 8px;
    }

    .story-meta {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .slide-count {
      color: #fff;
      font-size: 21px;
      font-weight: 900;
      white-space: nowrap;
      text-shadow: 0 2px 12px rgba(0, 0, 0, 0.7);
    }

    .story-content {
      position: absolute;
      z-index: 4;
      left: 45px;
      right: 45px;
      bottom: 115px;
      padding: 32px;
      border: 1px solid rgba(255, 255, 255, 0.13);
      border-radius: 20px;
      background: linear-gradient(
        145deg,
        rgba(5, 11, 21, 0.87),
        rgba(5, 11, 21, 0.68)
      );
      box-shadow: 0 12px 42px rgba(0, 0, 0, 0.2);
      backdrop-filter: blur(5px);
    }

    .story-content h1 {
      margin: 22px 0 0;
      color: #fff;
      font-size: 61px;
      font-weight: 950;
      letter-spacing: -1.9px;
      line-height: 1.04;
      overflow-wrap: anywhere;
      text-shadow: 0 2px 18px rgba(0, 0, 0, 0.35);
    }

    .accent-rule {
      width: 88px;
      height: 6px;
      margin: 20px 0;
      border-radius: 10px;
      background: var(--accent);
    }

    .story-summary {
      margin: 0;
      color: #f4f6fa;
      font-size: 27px;
      font-weight: 600;
      line-height: 1.43;
      overflow-wrap: anywhere;
    }

    .story-highlight {
      margin-top: 28px;
      padding: 20px 22px;
      border-left: 5px solid var(--accent, #0796db);
      border-radius: 7px;
      background: rgba(255, 255, 255, 0.11);
    }

    .highlight-heading {
      margin-bottom: 8px;
      color: #d6e0ec;
      font-size: 13px;
      font-weight: 900;
      letter-spacing: 1.5px;
    }

    .story-highlight p {
      margin: 0;
      color: #fff;
      font-size: 24px;
      font-weight: 900;
      line-height: 1.25;
    }

    .story-source {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-top: 28px;
      padding-top: 18px;
      border-top: 1px solid rgba(255, 255, 255, 0.3);
      color: #fff;
      font-size: 15px;
    }

    .story-source > span:first-child {
      color: #c7d0dc;
      font-size: 11px;
      font-weight: 900;
      letter-spacing: 1.4px;
    }

    .story-source strong {
      overflow-wrap: anywhere;
    }

    .story-source .story-page {
      margin-left: auto;
      color: #f2f4f8;
      font-weight: 900;
      white-space: nowrap;
    }

    .story-bottom-brand {
      position: absolute;
      z-index: 4;
      bottom: 37px;
      left: 45px;
      right: 45px;
      color: #fff;
      font-size: 15px;
      font-weight: 900;
      letter-spacing: 2px;
      text-shadow: 0 2px 10px rgba(0, 0, 0, 0.6);
    }

    .story-bottom-brand span {
      color: #ffb703;
    }

    /* Light-background text contrast */

    .adaptive-light .story-content {
      border-color: rgba(0, 0, 0, 0.08);
      background: rgba(255, 255, 255, 0.94);
    }

    .adaptive-light .story-content h1,
    .adaptive-light .story-summary,
    .adaptive-light .story-highlight p,
    .adaptive-light .story-source,
    .adaptive-light .story-source strong {
      color: #171717;
      text-shadow: none;
    }

    .adaptive-light .highlight-heading,
    .adaptive-light .story-source > span:first-child {
      color: #444;
    }

    .adaptive-light .story-highlight {
      background: rgba(0, 0, 0, 0.055);
    }

    .adaptive-light .story-source {
      border-top-color: rgba(0, 0, 0, 0.18);
    }

    .adaptive-light .story-source .story-page {
      color: #222;
    }

    .adaptive-light .story-bottom-brand,
    .adaptive-light .story-header .brand-name,
    .adaptive-light .story-header .date-pill,
    .adaptive-light .story-header .slide-count {
      color: #fff;
    }

    .adaptive-light .story-content .category-badge {
      color: #fff;
    }

    @media print {
      html,
      body {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
    }
  `;
}

function getContrastScript() {
  return `
    async function detectBrightness(image) {
      try {
        if (!image.complete || image.naturalWidth === 0) {
          return null;
        }

        const canvas = document.createElement("canvas");
        canvas.width = 24;
        canvas.height = 24;

        const context = canvas.getContext("2d", {
          willReadFrequently: true
        });

        context.drawImage(image, 0, 0, 24, 24);

        // Some remote images block canvas access.
        const pixels = context.getImageData(0, 0, 24, 24).data;

        let total = 0;
        let count = 0;

        for (let i = 0; i < pixels.length; i += 4) {
          const brightness =
            0.299 * pixels[i] +
            0.587 * pixels[i + 1] +
            0.114 * pixels[i + 2];

          total += brightness;
          count++;
        }

        return count ? total / count : null;
      } catch {
        return null;
      }
    }

    async function applyContrast() {
      const slides = document.querySelectorAll(".slide");

      for (const slide of slides) {
        const image = slide.querySelector(
          ".story-background > .background-image"
        );

        if (image) {
          const brightness = await detectBrightness(image);

          if (brightness !== null && brightness >= 155) {
            slide.classList.add("adaptive-light");
          }
        }
      }
    }
  `;
}

async function renderSlide(page, html, outputPath) {
  await page.setContent(
    `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=${WIDTH}">
          <style>${getStyles()}</style>
        </head>
        <body>
          ${html}
          <script>${getContrastScript()}</script>
        </body>
      </html>
    `,
    {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    }
  );

  // Wait briefly for remote images. Do not wait indefinitely for slow hosts.
  await page.evaluate(async () => {
    const images = Array.from(document.querySelectorAll(".background-image"));

    await Promise.all(images.map((image) => new Promise((resolve) => {
      if (image.complete) {
        resolve();
        return;
      }

      const finish = () => resolve();

      image.addEventListener("load", finish, { once: true });
      image.addEventListener("error", finish, { once: true });

      setTimeout(finish, 10000);
    })));

    // A failed image reveals the fallback artwork beneath it.
    for (const image of images) {
      if (!image.complete || image.naturalWidth === 0) {
        image.remove();
      }
    }

    if (typeof applyContrast === "function") {
      await applyContrast();
    }

    await document.fonts.ready;
  });

  await page.screenshot({
    path: outputPath,
    type: "jpeg",
    quality: 94,
    animations: "disabled",
  });
}

export async function renderCarousel(stories, outputDir = "output") {
  if (!Array.isArray(stories) || stories.length === 0) {
    throw new Error("No stories provided to renderCarousel().");
  }

  if (stories.length > 9) {
    throw new Error(
      "Maximum 9 news stories plus 1 cover slide are supported."
    );
  }

  await fs.mkdir(outputDir, { recursive: true });

  const browser = await chromium.launch({ headless: true });

  try {
    const page = await browser.newPage({
      viewport: {
        width: WIDTH,
        height: HEIGHT,
      },
      deviceScaleFactor: 1,
    });

    const imagePaths = [];
    const totalSlides = stories.length + 1;

    const coverPath = path.join(outputDir, "slide-01.jpg");

    await renderSlide(page, coverHtml(stories), coverPath);
    imagePaths.push(coverPath);

    for (let i = 0; i < stories.length; i++) {
      const outputPath = path.join(
        outputDir,
        `slide-${String(i + 2).padStart(2, "0")}.jpg`
      );

      await renderSlide(
        page,
        storyHtml(stories[i], i + 1, totalSlides),
        outputPath
      );

      imagePaths.push(outputPath);
    }

    console.log(`Generated ${imagePaths.length} slides at ${WIDTH}x${HEIGHT}.`);

    return imagePaths;
  } finally {
    await browser.close();
  }
}
