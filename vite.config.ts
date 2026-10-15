import { existsSync } from 'node:fs'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { join, resolve } from 'node:path'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

// The homepage (/) is the static 3D office page in public/index.html, and the
// React app lives in app.html. This mirrors public/_redirects for the dev and
// preview servers: existing static pages (including folder index.html files)
// are served as-is, and every other extensionless route falls back to app.html.
function staticHomeWithSpaFallback(): Plugin {
  const rewrite = (dir: string) => (req: IncomingMessage, _res: ServerResponse, next: () => void) => {
    const [path, query = ''] = (req.url ?? '/').split('?')
    const isInternal = path.startsWith('/@') || path.startsWith('/src/') || path.startsWith('/node_modules/')
    if (!isInternal && !/\.[a-z0-9]+$/i.test(path)) {
      const asFolder = join(dir, path, 'index.html')
      if (path.endsWith('/') && existsSync(asFolder)) {
        req.url = `${path}index.html${query ? `?${query}` : ''}`
      } else if (!path.endsWith('/') && existsSync(join(dir, path, 'index.html')) && path !== '/') {
        req.url = `${path}/index.html${query ? `?${query}` : ''}`
      } else {
        req.url = `/app.html${query ? `?${query}` : ''}`
      }
    }
    next()
  }
  return {
    name: 'static-home-with-spa-fallback',
    configureServer(server) {
      server.middlewares.use(rewrite(resolve(server.config.root, server.config.publicDir)))
    },
    configurePreviewServer(server) {
      server.middlewares.use(rewrite(resolve(server.config.root, server.config.build.outDir)))
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), staticHomeWithSpaFallback()],
  build: {
    rollupOptions: {
      input: resolve(__dirname, 'app.html'),
    },
  },
})
