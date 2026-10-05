import { Link } from 'react-router-dom'
import { Footer } from '../components/Footer'
import type { ReactNode } from 'react'

type LegalPageProps = {
  title: string
  updated: string
  children: ReactNode
}

export function LegalPage({ title, updated, children }: LegalPageProps) {
  return (
    <div className="legal-page">
      <header className="legal-header">
        <div className="section-inner legal-header__inner">
          <Link to="/" className="legal-header__brand">
            SonicRing
          </Link>
          <Link to="/" className="legal-header__back">
            ← Back to home
          </Link>
        </div>
      </header>

      <main className="legal-main">
        <div className="section-inner legal-content">
          <h1 className="legal-title">{title}</h1>
          <p className="legal-updated">Last updated: {updated}</p>
          <div className="legal-body">{children}</div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
