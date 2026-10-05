export type PageMetaEntry = {
  path: string
  title: string
  description: string
  noindex?: boolean
}

export const pageMetaList: PageMetaEntry[] = [
  {
    path: '/',
    title: 'SonicRing — Your AI Business Team',
    description:
      'SonicRing gives local businesses a full AI workforce — answering calls, capturing leads, booking appointments, and following up automatically, 24/7.',
  },
  {
    path: '/privacy-policy',
    title: 'Privacy Policy — SonicRing',
    description:
      'Read how SonicRing collects, uses, and protects your information across our website and AI business tools.',
  },
  {
    path: '/terms-and-conditions',
    title: 'Terms & Conditions — SonicRing',
    description:
      'Review the terms and conditions that govern your use of the SonicRing website and services.',
  },
  {
    path: '/report-audit',
    title: 'SEO & Site Audit Report — SonicRing',
    description:
      'A live audit of SonicRing’s own site: meta tags, Open Graph, crawlability, tracking setup, and PageSpeed Insights results.',
  },
]

export const defaultPageMeta: PageMetaEntry = {
  path: '',
  title: 'SonicRing',
  description: 'SonicRing — an AI workforce for local businesses.',
  noindex: true,
}

const pageMetaByPath = new Map(pageMetaList.map((entry) => [entry.path, entry]))

function normalizePathname(pathname: string) {
  if (pathname.length > 1 && pathname.endsWith('/')) {
    return pathname.slice(0, -1)
  }
  return pathname
}

export function getPageMeta(pathname: string): PageMetaEntry {
  const normalized = normalizePathname(pathname)
  return (
    pageMetaByPath.get(normalized) ?? { ...defaultPageMeta, path: normalized }
  )
}
