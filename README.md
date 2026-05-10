# Quantum Martial Arts San Francisco Static Site

This repository builds a static Cloudflare Pages site from the supplied `quantumsf_org*.json` crawl documents.

## Build

```bash
npm run build
```

The build output is written to `dist/`.

## Verify

```bash
npm run verify
```

The verification script checks that the homepage, core routes, Cloudflare Pages headers, redirects, and generated HTML files exist.
