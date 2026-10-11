import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const revalidate = 600;

type YouTubeVideo = {
  id: string;
  title: string;
  channel: string;
  publishedAt: string | null;
  url: string;
  views: number | null;
};

export async function GET(request: NextRequest) {
  const apiKey = process.env.YOUTUBE_API_KEY;
  const query = (request.nextUrl.searchParams.get("q") || "").trim().slice(0, 120);
  const country = (request.nextUrl.searchParams.get("country") || "IN").toUpperCase();
  const language = (request.nextUrl.searchParams.get("language") || "en").toLowerCase();
  const days = Math.min(90, Math.max(1, Number(request.nextUrl.searchParams.get("days") || 30)));

  if (!query) return NextResponse.json({ error: "A topic query is required." }, { status: 400 });
  if (!apiKey) {
    return NextResponse.json({
      configured: false,
      message: "YouTube API is not connected yet. Add YOUTUBE_API_KEY in the Vercel project environment to enable API-reported search estimates. This key can use the official free quota, subject to Google's limits.",
    });
  }

  const publishedAfter = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const params = new URLSearchParams({
    part: "snippet",
    type: "video",
    maxResults: "5",
    order: "date",
    regionCode: /^[A-Z]{2}$/.test(country) ? country : "IN",
    relevanceLanguage: /^[a-z]{2}$/.test(language) ? language : "en",
    q: query,
    publishedAfter,
    key: apiKey,
  });

  try {
    const searchResponse = await fetch(`https://www.googleapis.com/youtube/v3/search?${params.toString()}`, {
      next: { revalidate: 600 },
      signal: AbortSignal.timeout(8000),
    });
    const searchData = await searchResponse.json() as {
      error?: { message?: string };
      pageInfo?: { totalResults?: number };
      items?: Array<{ id?: { videoId?: string }; snippet?: { title?: string; channelTitle?: string; publishedAt?: string } }>;
    };

    if (!searchResponse.ok) {
      return NextResponse.json({
        configured: true,
        error: searchData.error?.message || "YouTube API request failed.",
        hint: searchResponse.status === 403
          ? "Check API enablement, key restrictions, and remaining quota in Google Cloud."
          : "Try again later or use the direct YouTube search link.",
      }, { status: 502 });
    }

    const rawVideos = (searchData.items || []).filter((item) => item.id?.videoId);
    const ids = rawVideos.map((item) => item.id!.videoId!);
    const stats = new Map<string, number>();
    if (ids.length) {
      const statsParams = new URLSearchParams({ part: "statistics", id: ids.join(","), key: apiKey });
      const statsResponse = await fetch(`https://www.googleapis.com/youtube/v3/videos?${statsParams.toString()}`, {
        next: { revalidate: 600 },
        signal: AbortSignal.timeout(8000),
      });
      if (statsResponse.ok) {
        const statsData = await statsResponse.json() as { items?: Array<{ id?: string; statistics?: { viewCount?: string } }> };
        for (const item of statsData.items || []) {
          const views = Number(item.statistics?.viewCount);
          if (item.id && Number.isFinite(views)) stats.set(item.id, views);
        }
      }
    }

    const videos: YouTubeVideo[] = rawVideos.map((item) => {
      const id = item.id!.videoId!;
      const published = item.snippet?.publishedAt;
      return {
        id,
        title: item.snippet?.title || "Untitled video",
        channel: item.snippet?.channelTitle || "Unknown channel",
        publishedAt: published && !Number.isNaN(Date.parse(published)) ? new Date(published).toISOString() : null,
        url: `https://www.youtube.com/watch?v=${id}`,
        views: stats.get(id) ?? null,
      };
    });

    return NextResponse.json({
      configured: true,
      query,
      country,
      language,
      days,
      approximateTotalResults: searchData.pageInfo?.totalResults ?? null,
      videos,
      fetchedAt: new Date().toISOString(),
      caveat: "YouTube's totalResults is an approximate search result count, not a guaranteed exact count of every video on YouTube.",
    }, { headers: { "Cache-Control": "public, s-maxage=600, stale-while-revalidate=1800" } });
  } catch {
    return NextResponse.json({
      configured: true,
      error: "Could not reach the YouTube Data API.",
      hint: "Check the server connection and try again.",
    }, { status: 502 });
  }
}
