"use client";

import { useEffect, useRef } from "react";

type Variant = "leaderboard" | "rectangle" | "rail";

const units = {
  leaderboard: { key: "e93216446708c55fc8572bc2545e5d77", width: 728, height: 90 },
  rectangle: { key: "f9cb0abd2b577279c3902c48cc354733", width: 300, height: 250 },
  rail: { key: "0e6f713e4710071fc62aac5d3ca9a40a", width: 160, height: 600 },
} as const;

export default function ToolsAd({ variant }: { variant: Variant }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = ref.current;
    if (!host || host.dataset.loaded === "true") return;

    host.dataset.loaded = "true";
    const u = units[variant];

    const config = document.createElement("script");
    config.text = `atOptions = { 'key' : '${u.key}', 'format' : 'iframe', 'height' : ${u.height}, 'width' : ${u.width}, 'params' : {} };`;
    host.appendChild(config);

    const script = document.createElement("script");
    script.src = `https://mergerindirect.com/${u.key}/invoke.js`;
    script.async = true;
    host.appendChild(script);
  }, [variant]);

  return (
    <div
      ref={ref}
      className={`toolsAd toolsAd--${variant}`}
      aria-label="Advertisement"
    >
      <span>ADVERTISEMENT</span>
    </div>
  );
}
