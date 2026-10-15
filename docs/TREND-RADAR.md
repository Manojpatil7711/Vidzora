# Trend Radar

Trend Radar is an early creator-research feature inside Vidzora.

## Available in the beta

- Country and language selection (India, US, UK, Canada, Australia; English, Hindi, Marathi).
- Google Trends RSS and Google News RSS discovery, with source status and a 10-minute cache.
- Topic/category filtering, saved topics, local creator-interest preferences and source links.
- Template-based idea prompts with source verification reminders.
- Optional YouTube Data API search estimate and recent matching video list.
- Browser notifications while the dashboard tab is open.

## Optional YouTube API setup

1. In Google Cloud Console, create or select a project.
2. Enable YouTube Data API v3 and create an API key.
3. Restrict the key to YouTube Data API v3 and, where feasible, the server-side usage pattern.
4. Add `YOUTUBE_API_KEY` as a server-only environment variable in the Vercel project for Preview first.
5. Redeploy and test the **YouTube activity** action on a topic.

Do not add the API key to a `NEXT_PUBLIC_*` variable, browser code, or a committed file. YouTube's `pageInfo.totalResults` is an approximate search-result count, not a guaranteed exact count of all videos. The official API has quota limits; the search endpoint uses a relatively large share of quota, so the UI calls it only when a creator requests activity for a specific topic.

## Important limits

- Google Trends and Google News feeds can vary by country, language, and availability.
- The dashboard does not count every YouTube video or every Instagram post.
- Instagram does not provide a universal public API for exact counts of all posts matching any topic. A future Instagram integration would need approved Meta API access and must describe its actual coverage.
- Browser notifications in this beta are delivered only while the dashboard is open. Background push requires a service worker, push credentials, subscription storage, and scheduled server-side checks.
- Preferences and saved topics are stored locally on the current browser/device; there is no account sync yet.
- Idea generation uses templates, not a connected generative AI provider.
- This is a beta and should not be marketed as an exact virality predictor.

## Next production steps

1. Verify the Preview build and the RSS endpoint end-to-end.
2. Add per-source health telemetry and safer retry/fallback behavior.
3. Configure YouTube API in Preview and measure quota use before broad rollout.
4. Validate feed quality with creators across multiple languages.
5. Add persistent profiles and background push only after selecting a free/affordable storage and push design.
6. Run a small beta before charging for Pro features.
