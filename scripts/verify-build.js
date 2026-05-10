import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const distDir = path.join(rootDir, "dist");

const requiredRoutes = [
  "index.html",
  "adults-martial-arts/index.html",
  "teens-martial-arts/index.html",
  "kids-martial-arts/index.html",
  "schedule/index.html",
  "membership/index.html",
  "donate/index.html",
  "contact-us/index.html",
  "sitemap.xml",
  "_redirects",
  "_headers"
];

const missing = requiredRoutes.filter((route) => !fs.existsSync(path.join(distDir, route)));

if (missing.length) {
  console.error(`Missing required build outputs:\n${missing.map((route) => `- ${route}`).join("\n")}`);
  process.exit(1);
}

const htmlFiles = [];

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath);
    } else if (entry.name.endsWith(".html")) {
      htmlFiles.push(fullPath);
    }
  }
}

walk(distDir);

const failures = [];

for (const file of htmlFiles) {
  const html = fs.readFileSync(file, "utf8");
  if (!html.includes("<header class=\"site-header\">")) {
    failures.push(`${path.relative(distDir, file)} missing header`);
  }
  if (!html.includes("<footer class=\"site-footer\">")) {
    failures.push(`${path.relative(distDir, file)} missing footer`);
  }
  if (!html.includes("/assets/styles.css")) {
    failures.push(`${path.relative(distDir, file)} missing stylesheet`);
  }
}

const index = fs.readFileSync(path.join(distDir, "index.html"), "utf8");
if (!index.includes("<h1>Quantum Martial Arts San Francisco</h1>")) {
  failures.push("homepage h1 is not the expected landing heading");
}

if (!index.includes("/adults-martial-arts/") || !index.includes("/kids-martial-arts/")) {
  failures.push("homepage is missing primary program links");
}

if (failures.length) {
  console.error(`Build verification failed:\n${failures.map((failure) => `- ${failure}`).join("\n")}`);
  process.exit(1);
}

console.log(`Verified ${htmlFiles.length} HTML files and required Cloudflare Pages outputs.`);
