import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { supabase, type Contact } from '../lib/supabase'
import './CheckoutPage.css'
import './MissionControlPage.css'

const TEAM_BY_GOAL: Record<string, { title: string; blurb: string }> = {
  'Get More Leads': {
    title: 'Lead Gen AI',
    blurb: 'Finds and qualifies new leads for your business.',
  },
  'Book More Appointments': {
    title: 'Appointments AI',
    blurb: 'Fills your calendar and reduces no-shows.',
  },
  'Follow Up With Customers': {
    title: 'Follow-Up AI',
    blurb: 'Keeps every customer conversation warm.',
  },
  'Marketing & Social Media': {
    title: 'Marketing AI',
    blurb: 'Creates content and runs your social presence.',
  },
  'SEO & Google': {
    title: 'SEO AI',
    blurb: 'Improves your visibility on Google Search & Maps.',
  },
  'Customer Support': {
    title: 'Support AI',
    blurb: 'Answers customer questions around the clock.',
  },
  'Automate Business Tasks': {
    title: 'Ops AI',
    blurb: 'Handles the repetitive admin work for you.',
  },
}

const STARTER_MISSIONS = [
  'Connect your business phone & email',
  'Set up your first lead capture form',
  'Launch your first follow-up sequence',
]

export function MissionControlPage() {
  const [params] = useSearchParams()
  const contactId = params.get('contact')
  const [contact, setContact] = useState<Contact | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!contactId) {
      setLoading(false)
      return
    }
    let cancelled = false
    supabase
      .from('contacts')
      .select('*')
      .eq('id', contactId)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return
        setContact((data as Contact) ?? null)
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [contactId])

  if (loading) {
    return (
      <main className="checkout thankyou">
        <div className="thankyou__inner">
          <p className="checkout__brand">SonicRing</p>
          <p className="thankyou__lead">Loading Mission Control…</p>
        </div>
      </main>
    )
  }

  if (!contact) {
    return (
      <main className="checkout checkout--status">
        <div className="checkout__inner checkout__status-card">
          <p className="checkout__brand">SonicRing</p>
          <h1 className="checkout__title">We couldn&apos;t find your account</h1>
          <Link to="/" className="checkout__cta checkout__cta--link">
            Back to home
          </Link>
        </div>
      </main>
    )
  }

  const team = (contact.business_goals?.length
    ? contact.business_goals
    : Object.keys(TEAM_BY_GOAL).slice(0, 3)
  )
    .map((goal) => TEAM_BY_GOAL[goal])
    .filter(Boolean)

  return (
    <main className="mc">
      <div className="mc__glow" aria-hidden="true" />
      <div className="mc__inner">
        <header className="mc__header">
          <p className="checkout__brand">SonicRing</p>
          <h1 className="mc__title">Mission Control</h1>
          <p className="mc__sub">
            {contact.company || 'Your business'} · Welcome back
            {contact.first_name ? `, ${contact.first_name}` : ''}.
          </p>
        </header>

        <section className="mc-card mc-ceo">
          <span className="mc-ceo__avatar" aria-hidden="true">
            AI
          </span>
          <div>
            <h2>Your AI CEO</h2>
            <p>
              I&apos;ve reviewed {contact.company || 'your business'} and
              assembled your starting AI workforce below, focused on{' '}
              {contact.business_goal || 'growing your business'}.
            </p>
          </div>
        </section>

        <section>
          <h2 className="mc-section-title">Your AI Workforce</h2>
          <div className="mc-team-grid">
            {team.map((member) => (
              <div className="mc-card mc-team-card" key={member.title}>
                <span className="mc-team-card__badge" aria-hidden="true">
                  ●
                </span>
                <h3>{member.title}</h3>
                <p>{member.blurb}</p>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="mc-section-title">First Missions</h2>
          <ol className="mc-missions">
            {STARTER_MISSIONS.map((mission) => (
              <li key={mission}>{mission}</li>
            ))}
          </ol>
        </section>
      </div>
    </main>
  )
}
