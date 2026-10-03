const AD_LINKS = [
  "https://omg10.com/4/11918611",
  "https://omg10.com/4/11918610",
  "https://omg10.com/4/11918605",
  "https://omg10.com/4/11565407",
  "https://omg10.com/4/11566837",
  "https://omg10.com/4/11587733",
] as const

export function gatedDownload(
  url: string,
  key: string,
  filename?: string,
): "ad" | "download" {
  if (typeof window === "undefined") return "download"

  const gateKey = `vidzora-ad-gate:${key}`
  if (sessionStorage.getItem(gateKey) === "armed") {
    sessionStorage.removeItem(gateKey)
    const a = document.createElement("a")
    a.href = url
    if (filename) a.download = filename
    a.rel = "noopener"
    document.body.appendChild(a)
    a.click()
    a.remove()
    return "download"
  }

  const index = Number(sessionStorage.getItem("vidzora-ad-index") || "0")
  const adUrl = AD_LINKS[index % AD_LINKS.length]
  sessionStorage.setItem("vidzora-ad-index", String((index + 1) % AD_LINKS.length))
  const opened = window.open(adUrl, "_blank", "noopener,noreferrer")
  if (opened) sessionStorage.setItem(gateKey, "armed")
  return "ad"
}
