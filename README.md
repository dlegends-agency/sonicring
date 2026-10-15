# SonicRing — Opt-in Funnel

React + Vite + TypeScript conversion of the [SonicRing opt-in page](https://bosslab.autophagytools.com/optin/).

## Scripts

```bash
npm install
npm run dev
npm run build
```

## What's included

- Hero with CTA + dashboard visual
- Problem / pain-point section
- AI team + dashboard sections
- Local business industries grid
- Traditional hiring vs SonicRing comparison
- Features / pricing table
- Opt-in modal (First Name + Email)

Images live in `public/images/` (downloaded from the source site).

## Page structure

- `/` — the 3D office homepage, a static page in `public/index.html`. Its CSS/JS
  and assets live in `public/office/` (three.js loads from a CDN, no build step).
- `/office/privacy-policy/`, `/office/terms-and-conditions/`, `/office/report-audit/` —
  static pages for the homepage. `/office/` itself redirects to `/`.
- Everything else (`/checkout`, `/onboarding`, `/admin`, `/privacy-policy`,
  `/terms-and-conditions`, `/report-audit`, and the previous funnel homepage at
  `/funnel`) is the React app, whose entry is `app.html`. `public/_redirects`
  sends unknown routes to `/app.html`, and a small plugin in `vite.config.ts`
  does the same for `npm run dev` and `vite preview`.
