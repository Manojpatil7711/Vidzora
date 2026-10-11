"use client";

import { type FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import styles from "./trend-radar.module.css";

type TrendItem = {
  id: string;
  title: string;
  url: string;
  source: string;
  sourceKind: "google-trends" | "google-news";
  publishedAt: string | null;
  description: string;
  country: string;
  language: string;
  category: string;
  traffic: string | null;
};

type FeedResponse = {
  items: TrendItem[];
  meta: {
    country: string;
    language: string;
    fetchedAt: string;
    refreshIntervalSeconds: number;
    sources: string[];
    unavailableSources: string[];
    note: string;
  };
};

const CATEGORIES = ["All", "Entertainment", "Sports", "Technology", "Politics", "Business", "Local & Weather", "Top stories"];
const COUNTRIES = [
  { value: "IN", label: "India" },
  { value: "US", label: "United States" },
  { value: "GB", label: "United Kingdom" },
  { value: "CA", label: "Canada" },
  { value: "AU", label: "Australia" },
];
const LANGUAGES = [
  { value: "en", label: "English" },
  { value: "hi", label: "हिंदी" },
  { value: "mr", label: "मराठी" },
];
const DEFAULT_INTERESTS = ["Entertainment", "Technology", "Sports"];

function timeAgo(value: string | null): string {
  if (!value) return "Recent";
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60000));
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function ideasFor(title: string, category: string): { label: string; text: string }[] {
  const topic = title.replace(/[.!?]+$/, "");
  const categoryAngle = category === "Entertainment"
    ? "काय बदलणार आहे आणि प्रेक्षकांनी काय लक्षात घ्यावे?"
    : category === "Sports"
      ? "महत्त्वाचे आकडे, सामन्याचा संदर्भ आणि पुढे काय होऊ शकते?"
      : category === "Technology"
        ? "सामान्य वापरकर्त्याला याचा प्रत्यक्ष फायदा किंवा तोटा काय?"
        : "या घटनेचा संदर्भ, परिणाम आणि पडताळलेली माहिती काय?";
  return [
    { label: "Quick explainer", text: `“${topic}” — 30–45 सेकंदांत काय घडले आणि का महत्त्वाचे आहे ते समजावून सांगा.` },
    { label: "Context & facts", text: `“${topic}” बद्दल 3 पडताळलेली तथ्ये, एक महत्त्वाचा संदर्भ आणि स्रोत दाखवा.` },
    { label: "Audience angle", text: `“${topic}” वर प्रेक्षकांचा सर्वात महत्त्वाचा प्रश्न घ्या: ${categoryAngle}` },
    { label: "Short vs long", text: `याच विषयाची 20 सेकंदांची झटपट आवृत्ती आणि 3 मिनिटांची सविस्तर आवृत्ती तयार करा.` },
    { label: "Myth check", text: `“${topic}” भोवती फिरणारे दावे तपासा. पुरावा नसेल तर तो दावा तथ्य म्हणून मांडू नका.` },
  ];
}

export default function TrendRadarPage() {
  const [country, setCountry] = useState("IN");
  const [language, setLanguage] = useState("mr");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [feed, setFeed] = useState<FeedResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [interests, setInterests] = useState<string[]>(DEFAULT_INTERESTS);
  const [interestInput, setInterestInput] = useState("");
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [selected, setSelected] = useState<TrendItem | null>(null);
  const [alertsEnabled, setAlertsEnabled] = useState(false);
  const firstLoad = useRef(true);
  const knownIds = useRef<Set<string>>(new Set());

  const refresh = useCallback(async (quiet = false) => {
    if (quiet) setRefreshing(true);
    else setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/trend-radar?country=${encodeURIComponent(country)}&language=${encodeURIComponent(language)}`, { cache: "no-store" });
      const data = await response.json() as FeedResponse & { error?: string };
      if (!response.ok) throw new Error(data.error || "Trend sources are temporarily unavailable. Please try again.");
      setFeed(data);
      const incoming = new Set(data.items.map((item) => item.id));
      if (!firstLoad.current && alertsEnabled && typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
        const fresh = data.items.find((item) => !knownIds.current.has(item.id) && (interests.includes(item.category) || interests.includes("All topics")));
        if (fresh) new Notification("New topic on Trend Radar", { body: fresh.title, icon: "/favicon.ico", tag: fresh.id });
      }
      knownIds.current = incoming;
      firstLoad.current = false;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load trend sources.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [country, language, alertsEnabled, interests]);

  useEffect(() => {
    try {
      const storedInterests = window.localStorage.getItem("trend-radar-interests");
      const storedSaved = window.localStorage.getItem("trend-radar-saved");
      const storedAlerts = window.localStorage.getItem("trend-radar-alerts");
      if (storedInterests) setInterests(JSON.parse(storedInterests) as string[]);
      if (storedSaved) setSavedIds(JSON.parse(storedSaved) as string[]);
      if (storedAlerts === "true") setAlertsEnabled(true);
    } catch {
      // Ignore unavailable or malformed local preferences.
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const timer = window.setInterval(() => void refresh(true), 10 * 60 * 1000);
    return () => window.clearInterval(timer);
  }, [refresh]);

  useEffect(() => {
    window.localStorage.setItem("trend-radar-interests", JSON.stringify(interests));
  }, [interests]);

  useEffect(() => {
    window.localStorage.setItem("trend-radar-saved", JSON.stringify(savedIds));
  }, [savedIds]);

  useEffect(() => {
    window.localStorage.setItem("trend-radar-alerts", String(alertsEnabled));
  }, [alertsEnabled]);

  const items = feed?.items ?? [];
  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase();
    return items.filter((item) => {
      const matchesCategory = category === "All" || item.category === category;
      const matchesQuery = !needle || `${item.title} ${item.description} ${item.source}`.toLocaleLowerCase().includes(needle);
      return matchesCategory && matchesQuery;
    });
  }, [items, query, category]);

  const savedItems = useMemo(() => items.filter((item) => savedIds.includes(item.id)), [items, savedIds]);
  const ideas = selected ? ideasFor(selected.title, selected.category) : [];
  const trendCount = items.filter((item) => item.sourceKind === "google-trends").length;
  const newsCount = items.filter((item) => item.sourceKind === "google-news").length;
  const countryLabel = COUNTRIES.find((item) => item.value === country)?.label ?? country;

  function toggleSaved(item: TrendItem) {
    setSavedIds((current) => current.includes(item.id) ? current.filter((id) => id !== item.id) : [...current, item.id]);
  }

  async function enableAlerts() {
    if (!("Notification" in window)) {
      setError("या ब्राउझरमध्ये Notifications उपलब्ध नाहीत. Chrome मधून ही साइट उघडून पाहा.");
      return;
    }
    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      setAlertsEnabled(true);
      new Notification("Trend Radar alerts enabled", { body: "या टॅबमध्ये नवीन जुळणारे विषय आढळल्यावर सूचना दिसेल." });
    } else {
      setAlertsEnabled(false);
      setError("Notifications साठी ब्राउझरची परवानगी आवश्यक आहे.");
    }
  }

  function addInterest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = interestInput.trim();
    if (!value) return;
    if (!interests.some((interest) => interest.toLocaleLowerCase() === value.toLocaleLowerCase())) setInterests((current) => [...current, value].slice(0, 12));
    setInterestInput("");
  }

  const showItems = category === "Saved" ? savedItems : filtered;

  return (
    <main className={styles.shell}>
      <header className={styles.nav}>
        <a href="/" className={styles.brand} aria-label="Vidzora home">
          <span className={styles.logo}>V</span>
          <span>Vidzora <span style={{ color: "#a4ff65" }}>Trend Radar</span></span>
        </a>
        <nav className={styles.navLinks}>
          <a href="/">Vidzora tools</a>
          <a href="#topics">Discover</a>
          <span className={styles.beta}>BETA</span>
        </nav>
      </header>

      <div className={styles.container}>
        <section className={styles.hero}>
          <div>
            <div className={styles.kicker}><span className={styles.liveDot} /> Creator intelligence</div>
            <h1 className={styles.title}>Stop searching.<br /><span>Start creating.</span></h1>
            <p className={styles.subtitle}>Discover fresh topics for your audience, check the source, and turn a trend into your next video idea. Built for creators who want less research and more time to create.</p>
          </div>
          <div className={styles.updated}>
            <div>{feed?.meta.fetchedAt ? `Updated ${new Date(feed.meta.fetchedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : "Waiting for sources"}</div>
            <div>Auto-refresh: every 10 minutes while this page is open</div>
            <div>{feed?.meta.sources.length ? feed.meta.sources.join(" · ") : "Live source status appears here"}</div>
          </div>
        </section>

        <section className={styles.controls} aria-label="Trend preferences">
          <div className={styles.control}>
            <label htmlFor="country">Target country</label>
            <select id="country" className={styles.select} value={country} onChange={(event) => setCountry(event.target.value)}>
              {COUNTRIES.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </div>
          <div className={styles.control}>
            <label htmlFor="language">Content language</label>
            <select id="language" className={styles.select} value={language} onChange={(event) => setLanguage(event.target.value)}>
              {LANGUAGES.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </div>
          <div className={styles.control}>
            <label htmlFor="search">Search topics</label>
            <input id="search" className={styles.searchInput} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="e.g. cricket, AI, film…" />
          </div>
          <div className={styles.actions}>
            <button type="button" className={styles.secondary} onClick={() => void refresh(true)} disabled={refreshing}>{refreshing ? "Refreshing…" : "↻ Refresh"}</button>
            <button type="button" className={styles.primary} onClick={() => void enableAlerts()}>{alertsEnabled ? "✓ Alerts on" : "Enable alerts"}</button>
          </div>
        </section>

        <section className={styles.stats} aria-label="Feed summary">
          <article className={styles.stat}><div className={styles.statLabel}>Topics found</div><div className={styles.statValue}>{loading ? "…" : items.length}</div><div className={styles.statNote}>Unique items from current feeds</div></article>
          <article className={styles.stat}><div className={styles.statLabel}>Search trends</div><div className={styles.statValue}>{loading ? "…" : trendCount}</div><div className={styles.statNote}>Google Trends RSS items received</div></article>
          <article className={styles.stat}><div className={styles.statLabel}>News signals</div><div className={styles.statValue}>{loading ? "…" : newsCount}</div><div className={styles.statNote}>Google News RSS headlines received</div></article>
          <article className={styles.stat}><div className={styles.statLabel}>Saved topics</div><div className={styles.statValue}>{savedIds.length}</div><div className={styles.statNote}>Saved on this device</div></article>
        </section>

        {error && <div className={styles.error} role="alert">{error}<br />Source availability can vary by country and language. Try refreshing or changing the selection.</div>}

        <div className={styles.layout}>
          <section className={styles.mainCol} id="topics">
            <div className={styles.sectionHead}>
              <div><h2 className={styles.sectionTitle}>Your discovery feed</h2><div className={styles.sectionHint}>{countryLabel} · {LANGUAGES.find((item) => item.value === language)?.label} · {filtered.length} matching items</div></div>
              <div className={styles.sectionHint}>Sources are linked on every item</div>
            </div>
            <div className={styles.filters}>
              {CATEGORIES.map((item) => <button type="button" key={item} className={`${styles.chip} ${category === item ? styles.chipActive : ""}`} onClick={() => setCategory(item)}>{item}</button>)}
              <button type="button" className={`${styles.chip} ${category === "Saved" ? styles.chipActive : ""}`} onClick={() => setCategory("Saved")}>★ Saved</button>
            </div>

            <div className={styles.feed}>
              {loading && !feed && <div className={styles.empty}><strong>Finding fresh topics…</strong>Connecting to the selected trend and news feeds.</div>}
              {!loading && !error && showItems.length === 0 && <div className={styles.empty}><strong>No matching topics found</strong>Try another category, search term, country or language. The dashboard does not invent trends when a source is empty.</div>}
              {showItems.map((item, index) => (
                <article className={styles.topic} key={item.id}>
                  <div className={styles.rank}>{String(index + 1).padStart(2, "0")}</div>
                  <div className={styles.topicBody}>
                    <div className={styles.topicMeta}>
                      <span className={item.sourceKind === "google-trends" ? styles.tag : `${styles.tag} ${styles.tagNews}`}>{item.sourceKind === "google-trends" ? "SEARCH TREND" : "NEWS SIGNAL"}</span>
                      <span>{item.category}</span><span>·</span><span>{timeAgo(item.publishedAt)}</span>
                      {item.traffic && <span>· {item.traffic} searches (source-reported)</span>}
                    </div>
                    <h3 className={styles.topicTitle}>{item.title}</h3>
                    {item.description && <p className={styles.desc}>{item.description}</p>}
                    <div className={styles.topicMeta}>Source: {item.source || (item.sourceKind === "google-trends" ? "Google Trends" : "Google News")}</div>
                    <div className={styles.topicActions} style={{ marginTop: 10 }}>
                      <a className={styles.smallBtn} href={item.url} target="_blank" rel="noreferrer">Open source ↗</a>
                      <a className={styles.smallBtn} href={`https://www.youtube.com/results?search_query=${encodeURIComponent(item.title)}`} target="_blank" rel="noreferrer">Check YouTube ↗</a>
                      <a className={styles.smallBtn} href={`https://www.instagram.com/explore/search/keyword/?q=${encodeURIComponent(item.title)}`} target="_blank" rel="noreferrer">Check Instagram ↗</a>
                      <button type="button" className={styles.smallBtn} onClick={() => setSelected(item)}>Generate ideas</button>
                      <button type="button" className={`${styles.smallBtn} ${savedIds.includes(item.id) ? styles.smallBtnSaved : ""}`} onClick={() => toggleSaved(item)}>{savedIds.includes(item.id) ? "★ Saved" : "☆ Save"}</button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <aside className={styles.sidebar}>
            <section className={styles.panel}>
              <h2 className={styles.panelTitle}>Your creator profile</h2>
              <p className={styles.panelText}>Choose the topics you create around. These preferences are stored locally on this device.</p>
              <div className={styles.interestList}>
                {interests.map((interest) => <span className={styles.interest} key={interest}>{interest}<button className={styles.remove} type="button" aria-label={`Remove ${interest}`} onClick={() => setInterests((current) => current.filter((value) => value !== interest))}>×</button></span>)}
              </div>
              <form className={styles.interestForm} onSubmit={addInterest}>
                <input className={styles.interestInput} value={interestInput} onChange={(event) => setInterestInput(event.target.value)} placeholder="Add niche / creator topic" aria-label="Add creator interest" maxLength={40} />
                <button className={styles.primary} type="submit" aria-label="Add interest">+</button>
              </form>
              <div className={styles.notice}>Alerts work while this dashboard tab is open. Background push notifications need a separately configured push service and are not enabled in this beta.</div>
            </section>

            <section className={styles.panel}>
              <h2 className={styles.panelTitle}>Idea studio</h2>
              <p className={styles.panelText}>{selected ? "Use these as starting points. Check the linked sources before publishing." : "Choose Generate ideas on any topic to create a starter pack."}</p>
              {selected && <div className={styles.ideaList}>
                <div className={styles.idea}><div className={styles.ideaLabel}>Selected topic</div><p className={styles.ideaText}>{selected.title}</p><a className={styles.smallBtn} style={{ marginTop: 10 }} href={selected.url} target="_blank" rel="noreferrer">Verify source ↗</a></div>
                {ideas.map((idea) => <div className={styles.idea} key={idea.label}><div className={styles.ideaLabel}>{idea.label}</div><p className={styles.ideaText}>{idea.text}</p></div>)}
                <button type="button" className={styles.secondary} onClick={() => { void navigator.clipboard?.writeText(ideas.map((idea) => `${idea.label}: ${idea.text}`).join("\n\n")); }}>Copy idea pack</button>
                <button type="button" className={styles.secondary} onClick={() => setSelected(null)}>Clear selection</button>
              </div>}
              {!selected && <div className={styles.notice}>Idea generation uses built-in templates in this no-key beta. AI-written scripts can be added after a free, sustainable provider is verified.</div>}
            </section>

            <section className={styles.panel}>
              <h2 className={styles.panelTitle}>Data honesty</h2>
              <p className={styles.panelText}>This beta shows only items received from the selected feeds. YouTube and Instagram links open platform searches; their total video/post counts are not claimed because public APIs do not provide a universal complete count.</p>
              <div className={styles.notice}>{feed?.meta.note ?? "Feed coverage depends on country, language, provider availability and rate limits."}</div>
              {feed?.meta.unavailableSources?.length ? <div className={styles.notice}>Unavailable now: {feed.meta.unavailableSources.join(", ")}</div> : null}
            </section>
          </aside>
        </div>
      </div>

      <footer className={styles.footer}>
        <span>Trend Radar · Early beta · Source links are provided for verification.</span>
        <span>Not affiliated with Google, YouTube, Meta or Instagram. Trends do not guarantee reach or virality.</span>
      </footer>
    </main>
  );
}
