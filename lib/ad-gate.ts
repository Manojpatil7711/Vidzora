const AD_LINKS = [
  "https://omg10.com/4/11918611",
  "https://omg10.com/4/11918610",
  "https://omg10.com/4/11918605",
  "https://omg10.com/4/11565407",
  "https://omg10.com/4/11566837",
  "https://omg10.com/4/11587733",
] as const

const COOLDOWN_MS = 24 * 60 * 60 * 1000

export function gatedDownload(
  url: string,
  key: string,
  filename?: string,
): "ad" | "download" {
  if (typeof window === "undefined") return "download"

  // One deliberate ad opportunity per user per 24 hours. The actual
  // download is never blocked: it starts in the same click.
  const lastShown = Number(localStorage.getItem("vidzora-ad-last") || "0")
  if (Date.now() - lastShown >= COOLDOWN_MS) {
    const index = Number(localStorage.getItem("vidzora-ad-index") || "0")
    const adUrl = AD_LINKS[index % AD_LINKS.length]
    const opened = window.open(adUrl, "_blank", "noopener,noreferrer")
    if (opened) {
      localStorage.setItem("vidzora-ad-last", String(Date.now()))
      localStorage.setItem("vidzora-ad-index", String((index + 1) % AD_LINKS.length))
    }
  }

  const a = document.createElement("a")
  a.href = url
  if (filename) a.download = filename
  a.rel = "noopener"
  document.body.appendChild(a)
  a.click()
  a.remove()
  return "download"
}
