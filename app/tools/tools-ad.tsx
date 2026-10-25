"use client";

type Variant = "leaderboard" | "rectangle" | "rail";

/**
 * Third-party display ads are intentionally disabled while Vidzora's
 * AdSense review is pending. Accept the existing variant prop so tool pages
 * remain type-safe, but do not load pop-under/redirect ad scripts.
 */
export default function ToolsAd({ variant: _variant }: { variant: Variant }) {
  return null;
}
