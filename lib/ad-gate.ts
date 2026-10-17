export function gatedDownload(url: string, _key: string, filename?: string): "download" {
  // Keep the download action direct. Never open advertising or a new tab.
  if (typeof window === "undefined") return "download";
  const a = document.createElement("a");
  a.href = url;
  if (filename) a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  return "download";
}
