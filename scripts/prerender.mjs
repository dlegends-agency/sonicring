// Prerenders the public marketing routes into static HTML inside dist/ so
// crawlers that don't execute JavaScript still see real content. The client
// SPA still loads and re-renders on top (see src/main.tsx — createRoot, not
// hydrateRoot), so this is a static SEO snapshot rather than true hydration.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'
import { preview } from 'vite'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')

const TRACKING_HOSTS =
  /^https?:\/\/([^/]+\.)?(facebook\.net|facebook\.com|googletagmanager\.com|google-analytics\.com)\//

const routes = [
  { path: '/', outFile: 'index.html' },
  { path: '/privacy-policy', outFile: 'privacy-policy/index.html' },
  { path: '/terms-and-conditions', outFile: 'terms-and-conditions/index.html' },
  { path: '/report-audit', outFile: 'report-audit/index.html' },
]

async function main() {
  const server = await preview({ root, preview: { port: 4319, strictPort: true } })
  const base = `http://localhost:4319`

  const browser = await chromium.launch()
  const page = await browser.newPage()

  // Don't fire tracking pixels from the build machine.
  await page.route(TRACKING_HOSTS, (route) => route.abort())

  for (const route of routes) {
    await page.goto(`${base}${route.path}`, { waitUntil: 'networkidle', timeout: 30000 })
    // Let PageMeta's effect (title/meta/OG/canonical/JSON-LD) settle.
    await page.waitForTimeout(150)

    // Drop third-party scripts injected at runtime (Facebook pixel, gtag).
    // If baked into the static HTML they run before the app sets up their
    // globals (e.g. `fbq is not defined`); the app re-injects them anyway.
    await page.evaluate(() => {
      for (const script of document.querySelectorAll('script[src]')) {
        const src = script.getAttribute('src') || ''
        if (/^(https?:)?\/\//.test(src)) script.remove()
      }
      // Sections start hidden (.reveal) until scrolled into view. Mark them
      // all visible in the snapshot so the page is readable before — or
      // without — the JS bundle; the app re-renders and re-animates on load.
      for (const el of document.querySelectorAll('.reveal')) {
        el.classList.add('is-visible')
      }
    })

    const html = await page.content()
    const outPath = join(root, 'dist', route.outFile)
    mkdirSync(dirname(outPath), { recursive: true })
    writeFileSync(outPath, `<!doctype html>\n${html}`)
    console.log(`Prerendered ${route.path} -> dist/${route.outFile}`)
  }

  await browser.close()
  await server.httpServer?.close()

  const indexPath = join(root, 'dist', 'index.html')
  if (!existsSync(indexPath) || readFileSync(indexPath, 'utf8').length < 100) {
    throw new Error('Prerender produced an unexpectedly small dist/index.html')
  }
}

main().catch((err) => {
  console.error('Prerender failed:', err)
  process.exit(1)
})
