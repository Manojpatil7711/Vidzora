import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const revalidate = 600;

type SourceKind = "google-trends" | "google-news";

type TrendItem = {
  id: string;
  title: string;
  url: string;
  source: string;
  sourceKind: SourceKind;
  publishedAt: string | null;
  description: string;
  country: string;
  language: string;
  category: string;
  traffic: string | null;
};

const COUNTRIES: Record<string, { hl: string; gl: string; ceid: string }> = {
  IN: { hl: "en-IN", gl: "IN", ceid: "IN:en" },
  US: { hl: "en-US", gl: "US", ceid: "US:en" },
  GB: { hl: "en-GB", gl: "GB", ceid: "GB:en" },
  CA: { hl: "en-CA", gl: "CA", ceid: "CA:en" },
  AU: { hl: "en-AU", gl: "AU", ceid: "AU:en" },
};

const LANGUAGE_CODES: Record<string, { hl: string; ceid: string }> = {
  en: { hl: "en", ceid: "en" },
  hi: { hl: "hi", ceid: "hi" },
  mr: { hl: "mr", ceid: "mr" },
};

function decodeXml(value: string): string {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCodePoint(Number(n)))
    .replace(/&#x([\da-f]+);/gi, (_, n: string) => String.fromCodePoint(parseInt(n, 16)))
    .trim();
}

function tag(block: string, name: string): string {
  const match = block.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, "i"));
  return match ? decodeXml(match[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ")) : "";
}

function categorize(title: string): string {
  const t = title.toLowerCase();
  if (/cricket|ipl|football|soccer|tennis|match|world cup|olympic|sports/.test(t)) return "Sports";
  if (/actor|actress|film|movie|cinema|trailer|box office|celebrity|singer|music|nana patekar/.test(t)) return "Entertainment";
  if (/election|minister|parliament|government|policy|court|politic|prime minister/.test(t)) return "Politics";
  if (/ai\b|artificial intelligence|technology|app launch|smartphone|google|openai|software/.test(t)) return "Technology";
  if (/market|stock|business|economy|bank|budget|share price|finance/.test(t)) return "Business";
  if (/weather|rain|cyclone|earthquake|flood|temperature/.test(t)) return "Local & Weather";
  return "Top stories";
}

function parseRss(xml: string, kind: SourceKind, country: string, language: string): TrendItem[] {
  const blocks = xml.match(/<item(?:\s[^>]*)?>[\s\S]*?<\/item>/gi) ?? [];
  return blocks.slice(0, 40).map((block, index) => {
    const title = tag(block, "title").replace(/\s+-\s+[^-]+$/, "").trim();
    const rawLink = tag(block, "link");
    const urlMatch = block.match(/<link(?:\s[^>]*)?>([\s\S]*?)<\/link>/i);
    const link = rawLink || (urlMatch ? decodeXml(urlMatch[1]) : "");
    const pubDate = tag(block, "pubDate");
    const description = tag(block, "description").slice(0, 260);
    const traffic = tag(block, "ht:approx_traffic") || null;
    const source = tag(block, "source") || (kind === "google-trends" ? "Google Trends" : "Google News");
    const published = pubDate && !Number.isNaN(Date.parse(pubDate)) ? new Date(pubDate).toISOString() : null;
    return {
      id: `${kind}-${country}-${encodeURIComponent(title.toLocaleLowerCase().slice(0, 80))}`,
      title,
      url: link,
      source,
      sourceKind: kind,
      publishedAt: published,
      description,
      country,
      language,
      category: categorize(title),
      traffic,
    };
  }).filter((item) => item.title && item.url && /^https?:\/\//i.test(item.url));
}

async function readFeed(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "TrendRadar/1.0 (+https://vidzora-pi.vercel.app/trend-radar)",
      Accept: "application/rss+xml, application/xml, text/xml;q=0.9, */*;q=0.8",
    },
    signal: AbortSignal.timeout(7000),
    next: { revalidate: 600 },
  });
  if (!response.ok) throw new Error(`Feed returned ${response.status}`);
  return response.text();
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const country = (params.get("country") || "IN").toUpperCase();
  const language = (params.get("language") || "en").toLowerCase();
  const supportedCountry = COUNTRIES[country] ? country : "IN";
  const supportedLanguage = LANGUAGE_CODES[language] ? language : "en";
  const countryConfig = COUNTRIES[supportedCountry];
  const languageConfig = LANGUAGE_CODES[supportedLanguage];

  const trendsUrl = `https://trends.google.com/trending/rss?geo=${supportedCountry}`;
  const newsUrl = `https://news.google.com/rss?hl=${encodeURIComponent(languageConfig.hl + (supportedCountry === "IN" ? "-IN" : ""))}&gl=${supportedCountry}&ceid=${supportedCountry}:${supportedLanguage}`;
  const fallbackNewsUrl = `https://news.google.com/rss?hl=${encodeURIComponent(countryConfig.hl)}&gl=${supportedCountry}&ceid=${countryConfig.ceid}`;

  const [trendsResult, newsResult] = await Promise.allSettled([
    readFeed(trendsUrl),
    readFeed(supportedLanguage === "en" ? fallbackNewsUrl : newsUrl),
  ]);

  const trends = trendsResult.status === "fulfilled"
    ? parseRss(trendsResult.value, "google-trends", supportedCountry, supportedLanguage)
    : [];
  const news = newsResult.status === "fulfilled"
    ? parseRss(newsResult.value, "google-news", supportedCountry, supportedLanguage)
    : [];

  const seen = new Set<string>();
  const items = [...trends, ...news].filter((item) => {
    const key = item.title.toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 60);

  const hasAnyFeed = trendsResult.status === "fulfilled" || newsResult.status === "fulfilled";
  return NextResponse.json({
    items,
    meta: {
      country: supportedCountry,
      language: supportedLanguage,
      fetchedAt: new Date().toISOString(),
      refreshIntervalSeconds: 600,
      sources: [
        ...(trendsResult.status === "fulfilled" ? ["Google Trends RSS"] : []),
        ...(newsResult.status === "fulfilled" ? ["Google News RSS"] : []),
      ],
      unavailableSources: [
        ...(trendsResult.status === "rejected" ? ["Google Trends RSS"] : []),
        ...(newsResult.status === "rejected" ? ["Google News RSS"] : []),
      ],
      note: "Search and news signals are not a complete count of all platform posts or videos. Results depend on source availability and locale.",
    },
  }, {
    status: hasAnyFeed ? 200 : 502,
    headers: { "Cache-Control": "public, s-maxage=600, stale-while-revalidate=1800" },
  });
}
