import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { getPageMeta } from '../data/pageMeta'
import { DEFAULT_OG_IMAGE, SITE_NAME, SITE_URL, TWITTER_HANDLE } from '../data/siteConfig'

function upsertMeta(attr: 'name' | 'property', key: string, content: string) {
  let tag = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`)
  if (!tag) {
    tag = document.createElement('meta')
    tag.setAttribute(attr, key)
    document.head.appendChild(tag)
  }
  tag.setAttribute('content', content)
}

function upsertLink(rel: string, href: string) {
  let tag = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`)
  if (!tag) {
    tag = document.createElement('link')
    tag.setAttribute('rel', rel)
    document.head.appendChild(tag)
  }
  tag.setAttribute('href', href)
}

function upsertJsonLd(id: string, data: Record<string, unknown> | null) {
  let tag = document.head.querySelector<HTMLScriptElement>(`script[data-jsonld="${id}"]`)
  if (!data) {
    tag?.remove()
    return
  }
  if (!tag) {
    tag = document.createElement('script')
    tag.type = 'application/ld+json'
    tag.setAttribute('data-jsonld', id)
    document.head.appendChild(tag)
  }
  tag.textContent = JSON.stringify(data)
}

export function PageMeta() {
  const { pathname } = useLocation()

  useEffect(() => {
    const meta = getPageMeta(pathname)
    const canonicalUrl = `${SITE_URL}${pathname === '/' ? '' : pathname}`

    document.title = meta.title
    upsertMeta('name', 'description', meta.description)
    upsertLink('canonical', canonicalUrl)

    if (meta.noindex) {
      upsertMeta('name', 'robots', 'noindex, nofollow')
    } else {
      upsertMeta('name', 'robots', 'index, follow')
    }

    upsertMeta('property', 'og:type', 'website')
    upsertMeta('property', 'og:site_name', SITE_NAME)
    upsertMeta('property', 'og:title', meta.title)
    upsertMeta('property', 'og:description', meta.description)
    upsertMeta('property', 'og:url', canonicalUrl)
    upsertMeta('property', 'og:image', DEFAULT_OG_IMAGE)
    upsertMeta('property', 'og:image:width', '1200')
    upsertMeta('property', 'og:image:height', '630')

    upsertMeta('name', 'twitter:card', 'summary_large_image')
    upsertMeta('name', 'twitter:site', TWITTER_HANDLE)
    upsertMeta('name', 'twitter:title', meta.title)
    upsertMeta('name', 'twitter:description', meta.description)
    upsertMeta('name', 'twitter:image', DEFAULT_OG_IMAGE)

    upsertJsonLd(
      'organization',
      pathname === '/'
        ? {
            '@context': 'https://schema.org',
            '@type': 'Organization',
            name: SITE_NAME,
            url: SITE_URL,
            logo: `${SITE_URL}/images/sonicring-logo.webp`,
          }
        : null,
    )

    upsertJsonLd(
      'website',
      pathname === '/'
        ? {
            '@context': 'https://schema.org',
            '@type': 'WebSite',
            name: SITE_NAME,
            url: SITE_URL,
          }
        : null,
    )
  }, [pathname])

  return null
}
