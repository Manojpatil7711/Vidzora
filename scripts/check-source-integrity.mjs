import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, extname } from "node:path";

const ROOT = process.cwd();
const SOURCE_EXTENSIONS = new Set([".js", ".jsx", ".ts", ".tsx", ".mjs", ".cjs"]);
const SKIP = new Set(["node_modules", ".next", ".git", "coverage", "dist", "build"]);

const suspicious = [];
const files = [];

function walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (SKIP.has(entry.name)) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (SOURCE_EXTENSIONS.has(extname(entry.name))) files.push(full);
  }
}

walk(ROOT);

for (const file of files) {
  const text = readFileSync(file, "utf8");
  // A literal backslash+n between source tokens is almost always an accidental
  // escaped newline introduced during generated/file-content writes.
  if (/\\n(?=\\s*(?:if|const|let|var|function|return|throw|export|import|class|interface|type|[}\\]]))/m.test(text)) {
    suspicious.push(file.replace(ROOT + "/", ""));
  }
}

if (suspicious.length) {
  console.error("Source integrity check failed. Suspicious literal \\n sequences found in:");
  for (const file of suspicious) console.error(" - " + file);
  console.error("Fix the source formatting before running a production build.");
  process.exit(1);
}

console.log("Source integrity check passed (" + files.length + " source files scanned).");
