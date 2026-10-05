import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { loadPixelSettings, type PixelTrackingSettings } from '../lib/pixelSettings'
import { SITE_GA_ID } from '../data/siteConfig'
import './ReportAuditPage.css'

type Status = 'Open' | 'Review' | 'Fixed'

const statusClass: Record<Status, string> = {
  Open: 'ra-badge ra-badge--open',
  Review: 'ra-badge ra-badge--review',
  Fixed: 'ra-badge ra-badge--done',
}

function StatusBadge({ status }: { status: Status }) {
  return <span className={statusClass[status]}>{status}</span>
}

const staticIssues: { area: string; issue: string; resolution: string; status: Status }[] = [
  {
    area: 'Site-wide — document head',
    issue:
      'All routes shared one static <title> and no meta description existed.',
    resolution:
      'Added PageMeta (src/components/PageMeta.tsx) + src/data/pageMeta.ts so every route sets a unique title and description on route change, and gets baked into the prerendered HTML.',
    status: 'Fixed',
  },
  {
    area: 'Site-wide — social sharing',
    issue:
      'No Open Graph or Twitter Card tags existed. Shared links fell back to generic browser defaults.',
    resolution:
      'Page-level og:title, og:description, og:image, og:url, and twitter:card are now set via PageMeta. Added a dedicated 1200×630 share image at /images/og-image.png.',
    status: 'Fixed',
  },
  {
    area: 'Site-wide — crawlability',
    issue:
      'No robots.txt or sitemap.xml existed, and the SPA had no prerendering — crawlers that skip JS execution saw an empty shell.',
    resolution:
      'Added public/robots.txt and public/sitemap.xml. Added scripts/prerender.mjs, which runs after every build and snapshots real rendered HTML (title, meta, OG, canonical, JSON-LD, and full page content) into dist/ for /, /privacy-policy, and /terms-and-conditions.',
    status: 'Fixed',
  },
  {
    area: 'Site-wide — canonical & structured data',
    issue: 'No canonical link tags and no schema.org JSON-LD existed anywhere.',
    resolution:
      'Canonical link is set per route via PageMeta. Organization + WebSite JSON-LD is injected on the homepage.',
    status: 'Fixed',
  },
  {
    area: 'Hosting — SPA fallback',
    issue:
      'No explicit _redirects, _headers, or vercel.json was committed for deep-link rewrites on a static host.',
    resolution:
      'Added public/_redirects with a catch-all SPA fallback rule. Cloudflare Pages serves the prerendered static files first where they exist, then falls back to this rule for any other route.',
    status: 'Fixed',
  },
  {
    area: 'Favicon',
    issue: 'Only a single favicon.svg was served — no PNG/ICO fallback.',
    resolution:
      'Added favicon-32x32.png and apple-touch-icon.png, rendered from the existing SVG, and linked them in index.html.',
    status: 'Fixed',
  },
  {
    area: 'This page — prerendering & indexing',
    issue:
      'This page itself was not in the prerender route list, so crawlers and PageSpeed both saw the prerendered homepage HTML (hero image included) instead of its own content, and a pathname/trailing-slash mismatch made its meta robots tag fall back to noindex regardless of the config.',
    resolution:
      'Added /report-audit to scripts/prerender.mjs and src/data/pageMeta.ts, and fixed getPageMeta to normalize trailing slashes. robots.txt no longer disallows this page.',
    status: 'Fixed',
  },
  {
    area: 'Bundle size',
    issue: 'Main JS chunk was ~650KB minified (~177KB gzipped), including the entire admin dashboard and checkout flow on every page load.',
    resolution:
      'Route-level code-splitting via React.lazy for /admin/* and /checkout/* — the shared/homepage bundle dropped to ~528KB minified (~153KB gzipped).',
    status: 'Fixed',
  },
]

const pages = [
  {
    name: 'Homepage',
    url: '/',
    title: 'SonicRing — Your AI Business Team',
    description: 'SonicRing gives local businesses a full AI workforce…',
  },
  {
    name: 'Privacy Policy',
    url: '/privacy-policy',
    title: 'Privacy Policy — SonicRing',
    description: 'Read how SonicRing collects, uses, and protects your information…',
  },
  {
    name: 'Terms & Conditions',
    url: '/terms-and-conditions',
    title: 'Terms & Conditions — SonicRing',
    description: 'Review the terms and conditions that govern your use…',
  },
]

const pageSpeedCapturedAt = 'Sep 19, 2026 (mobile, Lighthouse, this page)'

const pageSpeed = [
  { label: 'Performance', score: 86 },
  { label: 'Accessibility', score: 100 },
  { label: 'Best Practices', score: 96 },
  { label: 'SEO', score: 100 },
]

const phase2: { priority: 'High' | 'Medium' | 'Low'; scope: string; issue: string; fix: string }[] = [
  {
    priority: 'Low',
    scope: 'Performance',
    issue:
      'Largest Contentful Paint is 3.8s on mobile, mainly from third-party scripts (Google Tag Manager 172KB, Facebook Pixel 108KB) and ~203KB of unused JavaScript in the shared bundle.',
    fix: 'Defer loading GTM/Facebook Pixel until after first paint, and audit the shared bundle for unused code.',
  },
]

export function ReportAuditPage() {
  const [settings, setSettings] = useState<PixelTrackingSettings | null>(null)

  useEffect(() => {
    let cancelled = false
    loadPixelSettings().then((result) => {
      if (!cancelled) setSettings(result)
    })
    return () => {
      cancelled = true
    }
  }, [])

  const today = new Date().toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  const fbId = settings?.facebook.pixel_id.trim() ?? ''
  const gaId = settings?.google_analytics.measurement_id.trim() ?? ''
  const adsId = settings?.google_ads.conversion_id.trim() ?? ''
  const loaded = settings !== null
  // GA4 is installed site-wide via the Google tag in index.html.
  const configuredCount = [fbId, SITE_GA_ID, adsId].filter(Boolean).length

  const trackers: {
    tool: string
    id: string
    source: string
    configured: boolean
    statusLabel?: string
    notes: string
  }[] = [
    {
      tool: 'Facebook Pixel',
      id: fbId || 'Set via /admin/settings',
      source: 'connect.facebook.net/en_US/fbevents.js',
      configured: Boolean(fbId),
      notes: 'Loads once a pixel ID is saved. Fires PageView, Lead, AddToCart, Purchase — each toggleable per event.',
    },
    {
      tool: 'Google Analytics (GA4)',
      id: SITE_GA_ID,
      source: 'googletagmanager.com/gtag/js',
      configured: true,
      statusLabel: 'Active',
      notes:
        gaId && gaId !== SITE_GA_ID
          ? `Google tag in index.html on every page (automatic page_view). /admin/settings also sends events to ${gaId}.`
          : 'Google tag in index.html on every page (automatic page_view). Leave the /admin/settings GA4 field empty to avoid double-counting.',
    },
    {
      tool: 'Google Ads',
      id: adsId || 'Set via /admin/settings',
      source: 'shares gtag.js with GA4',
      configured: Boolean(adsId),
      notes: 'Fires conversion events for leads and purchases once a conversion ID and labels are saved.',
    },
    {
      tool: 'Cloudflare Web Analytics',
      id: 'beacon.min.js',
      source: 'https://static.cloudflareinsights.com/beacon.min.js',
      configured: true,
      statusLabel: 'Active',
      notes: 'Detected on production. Privacy-friendly page analytics via Cloudflare.',
    },
  ]

  const trackingStatus: Status =
    configuredCount === 3 ? 'Fixed' : configuredCount > 0 ? 'Review' : 'Open'

  const issues: { area: string; issue: string; resolution: string; status: Status }[] = [
    ...staticIssues,
    {
      area: 'Tracking — pixel configuration',
      issue:
        'Facebook Pixel and Google Ads code is implemented, but their IDs are empty by default. GA4 is installed site-wide.',
      resolution: loaded
        ? `${configuredCount}/3 trackers configured (GA4 site-wide; Facebook Pixel and Google Ads in /admin/settings). Verify events fire in each platform's test tool.`
        : 'Enter live pixel / measurement / conversion IDs in /admin/settings, then verify events in each platform’s test tool.',
      status: trackingStatus,
    },
  ]

  const stats = [
    { value: '3', label: 'Content Pages' },
    { value: '3/3', label: 'With Meta Description' },
    { value: '3/3', label: 'With OG Tags' },
    { value: '3/3', label: 'With Canonical' },
    { value: '3/3', label: 'Unique Titles' },
    { value: loaded ? `${configuredCount}/3` : '…', label: 'Trackers Configured' },
  ]

  return (
    <main className="report-audit">
      <header className="ra-header">
        <div className="ra-header__top">
          <p className="ra-brand">SonicRing</p>
          <Link to="/" className="ra-back">
            ← Back to site
          </Link>
        </div>
        <h1>SEO &amp; Site Audit Report</h1>
        <p className="ra-meta">
          SonicRing — Last updated {today} · Vite 8 + React 19 SPA · 3 content
          pages audited
        </p>
      </header>

      <section className="ra-stats">
        {stats.map((stat) => (
          <div className="ra-stat" key={stat.label}>
            <p className="ra-stat__value">{stat.value}</p>
            <p className="ra-stat__label">{stat.label}</p>
          </div>
        ))}
      </section>

      <section className="ra-summary">
        <p>
          <span className="ra-summary__icon ra-summary__icon--good">✓</span>
          Unique per-page titles, descriptions, Open Graph + Twitter tags,
          canonicals, Schema.org JSON-LD, sitemap/robots, an SPA fallback
          rule, and build-time prerendering are all live for the 3 content
          pages. PNG/Apple-touch favicons are in place.
          {loaded && configuredCount > 0
            ? ` ${configuredCount}/3 tracking platforms are configured and live.`
            : ''}
        </p>
        {loaded && configuredCount < 3 ? (
          <p>
            <span className="ra-summary__icon ra-summary__icon--warn">⚠</span>
            Remaining: {3 - configuredCount} tracking platform
            {3 - configuredCount === 1 ? '' : 's'} still unconfigured.
          </p>
        ) : null}
      </section>

      <section className="ra-section">
        <h2>Baseline Issues &amp; Recommendations</h2>
        <p className="ra-section__sub">
          Findings from the original audit and what shipped since. Items
          below are fixed unless marked Open or Review.
        </p>
        <div className="ra-table-wrap">
          <table className="ra-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Area</th>
                <th>Issue</th>
                <th>Resolution</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {issues.map((row, index) => (
                <tr key={row.area}>
                  <td>{index + 1}</td>
                  <td>{row.area}</td>
                  <td>{row.issue}</td>
                  <td>{row.resolution}</td>
                  <td>
                    <StatusBadge status={row.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="ra-section">
        <h2>Tracking &amp; Analytics Codes</h2>
        <p className="ra-section__sub">
          Facebook Pixel and Google Ads status is read live from
          /admin/settings; GA4 and Cloudflare Web Analytics run site-wide.
        </p>
        <div className="ra-table-wrap">
          <table className="ra-table">
            <thead>
              <tr>
                <th>Tool</th>
                <th>ID / Tag</th>
                <th>Script Source</th>
                <th>Status</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {trackers.map((row) => (
                <tr key={row.tool}>
                  <td>{row.tool}</td>
                  <td>
                    <code>{row.id}</code>
                  </td>
                  <td>
                    <code>{row.source}</code>
                  </td>
                  <td>
                    <span
                      className={
                        row.configured
                          ? 'ra-badge ra-badge--done'
                          : 'ra-badge ra-badge--review'
                      }
                    >
                      {row.statusLabel ??
                        (row.configured ? 'Configured' : 'Not configured')}
                    </span>
                  </td>
                  <td>{row.notes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="ra-section">
        <h2>SEO Audit by Page</h2>
        <p className="ra-section__sub">
          Title &lt; 60 chars · Description &lt; 160 chars · OG = page-level
          Open Graph · Schema = JSON-LD · Canonical = per-page URL. All
          served both client-side (PageMeta) and baked into the prerendered
          static HTML.
        </p>
        <div className="ra-table-wrap">
          <table className="ra-table">
            <thead>
              <tr>
                <th>Page</th>
                <th>URL</th>
                <th>Title</th>
                <th>Description</th>
                <th>OG</th>
                <th>Schema</th>
                <th>Canonical</th>
              </tr>
            </thead>
            <tbody>
              {pages.map((page) => (
                <tr key={page.url}>
                  <td>{page.name}</td>
                  <td>
                    <code>{page.url}</code>
                  </td>
                  <td>{page.title}</td>
                  <td>{page.description}</td>
                  <td className="ra-cell-check">✓</td>
                  <td className="ra-cell-check">
                    {page.url === '/' ? '✓' : '—'}
                  </td>
                  <td className="ra-cell-check">✓</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="ra-section">
        <h2>PageSpeed Insights Audit</h2>
        <p className="ra-section__sub">
          Baseline captured {pageSpeedCapturedAt}.
        </p>
        <div className="ra-pagespeed">
          {pageSpeed.map((item) => (
            <div
              className={`ra-pagespeed__item${
                item.score >= 90
                  ? ' is-good'
                  : item.score >= 50
                    ? ' is-average'
                    : ' is-poor'
              }`}
              key={item.label}
            >
              <p className="ra-pagespeed__score">{item.score}</p>
              <p className="ra-pagespeed__label">{item.label}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="ra-section">
        <h2>Remaining Gaps &amp; Phase 2 Recommendations</h2>
        <div className="ra-table-wrap">
          <table className="ra-table">
            <thead>
              <tr>
                <th>Priority</th>
                <th>Scope</th>
                <th>Issue</th>
                <th>Recommended Fix</th>
              </tr>
            </thead>
            <tbody>
              {phase2.map((row) => (
                <tr key={row.scope + row.issue}>
                  <td>
                    <span
                      className={`ra-badge ra-badge--priority-${row.priority.toLowerCase()}`}
                    >
                      {row.priority}
                    </span>
                  </td>
                  <td>{row.scope}</td>
                  <td>{row.issue}</td>
                  <td>{row.fix}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="ra-section">
        <h2>Technical Infrastructure</h2>
        <div className="ra-table-wrap">
          <table className="ra-table ra-table--kv">
            <tbody>
              <tr>
                <th scope="row">Framework</th>
                <td>Vite 8.2 + React 19.2 (client-rendered SPA)</td>
              </tr>
              <tr>
                <th scope="row">Router</th>
                <td>react-router-dom 7 — BrowserRouter</td>
              </tr>
              <tr>
                <th scope="row">Rendering</th>
                <td>
                  Client-rendered SPA + build-time prerendered HTML snapshot
                  (scripts/prerender.mjs) for the 3 marketing routes
                </td>
              </tr>
              <tr>
                <th scope="row">Sitemap</th>
                <td>public/sitemap.xml</td>
              </tr>
              <tr>
                <th scope="row">robots.txt</th>
                <td>public/robots.txt</td>
              </tr>
              <tr>
                <th scope="row">SPA fallback</th>
                <td>public/_redirects (catch-all → /index.html)</td>
              </tr>
              <tr>
                <th scope="row">Favicon</th>
                <td>/favicon.svg + /favicon-32x32.png + /apple-touch-icon.png</td>
              </tr>
              <tr>
                <th scope="row">OG image</th>
                <td>/images/og-image.png (1200×630)</td>
              </tr>
              <tr>
                <th scope="row">Structured data</th>
                <td>Organization + WebSite JSON-LD on homepage</td>
              </tr>
              <tr>
                <th scope="row">Analytics</th>
                <td>
                  Facebook Pixel + GA4 + Google Ads —{' '}
                  {loaded ? `${configuredCount}/3 configured` : 'checking…'}
                </td>
              </tr>
              <tr>
                <th scope="row">Backend</th>
                <td>Supabase — contacts CRM, automations, Stripe checkout edge functions</td>
              </tr>
              <tr>
                <th scope="row">Primary CTA</th>
                <td>"Get Early Access" → waitlist popup / checkout</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <p className="ra-footer">
        Internal report — generated {today} for SonicRing.
      </p>
    </main>
  )
}
