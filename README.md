# Instagram News Carousel Automation

Node.js starter: RSS collection, title deduplication, original 1080×1350 JPEG slides, SQLite run logs, optional Discord failure alert, and an official Instagram Graph API publishing function.

## Safe defaults
- Publishing is disabled (`PUBLISH_TO_INSTAGRAM=false`).
- The current GitHub workflow renders images as a dry run.
- GitHub Actions runners are ephemeral: local SQLite and images do not persist between runs. Configure persistent storage before relying on deduplication across days.
- RSS headline/summary text is not independent fact-checking. For sensitive or high-impact claims, require corroboration from a second reputable source before publishing.
- Uses original text-based graphics, not copied publisher photos. Check feed terms and image rights.

## Local setup
Requires Node.js 20+ (22 recommended).

```bash
cp .env.example .env
npm install
npx playwright install chromium
npm run check
npm run run
```

Images are written to `output/`. Keep `.env` private and never commit access tokens.

## Before enabling real publishing
1. Use an eligible Instagram Professional account and configure a Meta developer app.
2. Follow Meta's current official Instagram publishing documentation for the supported login flow and permissions.
3. Set `IG_USER_ID` and `IG_ACCESS_TOKEN` securely.
4. Implement public media hosting: upload every generated image to a public HTTPS URL accessible by Meta. Local paths and GitHub workflow artifacts are not sufficient.
5. Configure persistent database storage (managed database or another durable store) so deduplication survives workflow runs.
6. Test publishing with a controlled account and confirm the API response and resulting post.
7. Only then set `PUBLISH_TO_INSTAGRAM=true` and supply one `PUBLIC_IMAGE_URLS` URL per slide.

## Schedule and alerts
The workflow is configured for 6:00 PM Asia/Kolkata. GitHub may delay scheduled jobs; it is not guaranteed to run at the exact second. Add the `NEWS_FEEDS` and optional `DISCORD_WEBHOOK_URL` repository secrets.
