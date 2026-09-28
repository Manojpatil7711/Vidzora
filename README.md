# Vidzora

Premium mobile-first social video downloader.

## Current scope
- Public TikTok links
- No account
- No persistent download history
- Server-side provider request
- SEO metadata, sitemap and robots
- GitHub Actions build verification

## Google Search Console
Search Console is free. After deployment:
1. Open Google Search Console.
2. Add the exact site URL as a URL-prefix property: https://vidzora.vercel.app
3. Verify ownership using the available method.
4. Submit: https://vidzora.vercel.app/sitemap.xml
5. Use URL Inspection and request indexing for the homepage.

Search Console can monitor indexing, search performance and Core Web Vitals. It does not provide a paid 'upgrade' that is required for indexing.

## Important
The downloader only works for public links and availability can change with platform/provider changes.
