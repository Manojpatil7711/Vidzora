# Vidzora

Fast, mobile-first social video downloader.

## Current scope
- TikTok public URLs
- No user accounts
- No persistent download history
- Server-side provider request
- Responsive premium UI
- Basic SEO metadata, robots and sitemap

## Architecture
Next.js App Router + Route Handler. The provider is isolated behind `/api/download` so additional platforms can be added without rebuilding the frontend.

## Development
```bash
npm install
npm run dev
```

## Production
```bash
npm run build
npm start
```

Only download content you have permission to use. Platform terms and copyright rules still apply.
