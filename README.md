# My Words App

A vocabulary study app built with React, TypeScript, and Vite.

## Scripts

- `npm run dev`: start the local dev server
- `npm run build`: build production assets into `dist/`
- `npm run lint`: run ESLint

## Cloudflare Workers Deploy

This project is deployed as a Cloudflare Workers static assets site.

- Build command: `npm run build`
- Deploy command: `npx wrangler deploy`

SPA fallback is configured in [wrangler.toml](/C:/Users/manda/Desktop/myproject/my-words-app/wrangler.toml:1) with `assets.not_found_handling = "single-page-application"`.

Do not add `/* /index.html 200` to `public/_redirects`. Cloudflare normalizes `/index.html` and `/about/index.html`, so that rule is rejected as an infinite loop.
