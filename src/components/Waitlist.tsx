import { useState, type FormEvent } from 'react'
import { industries } from '../data'
import { useReveal } from '../hooks/useReveal'
import { runFormSubmitAutomations } from '../lib/automationEngine'
import { supabase, type Contact } from '../lib/supabase'
import { trackLead } from '../lib/tracking'
import {
  ArrowRightIcon,
  ClockIcon,
  IndustryIcon,
  LockIcon,
  MailIcon,
  PhoneIcon,
  RocketIcon,
  StarIcon,
  TagIcon,
  UsersIcon,
} from './Icons'

const benefits = [
  {
    icon: RocketIcon,
    title: 'Early access',
    copy: 'Get in before the public launch.',
  },
  {
    icon: MailIcon,
    title: 'Product updates',
    copy: "Be the first to know what's new.",
  },
  {
    icon: TagIcon,
    title: 'Special launch pricing',
    copy: 'Exclusive offers for waitlist members.',
  },
  {
    icon: StarIcon,
    title: 'Early feature access',
    copy: 'Try new features ahead of everyone.',
  },
  {
    icon: UsersIcon,
    title: 'First access to new AI employees',
    copy: 'Expand your team before anyone else.',
  },
]

export function Waitlist() {
  const { ref, className } = useReveal<HTMLElement>()

  const [businessName, setBusinessName] = useState('')
  const [businessEmail, setBusinessEmail] = useState('')
  const [businessType, setBusinessType] = useState('')
  const [phone, setPhone] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    setSubmitting(true)

    const trimmedName = businessName.trim()
    const trimmedEmail = businessEmail.trim().toLowerCase()
    const trimmedPhone = phone.trim()

    const payload = {
      first_name: trimmedName,
      company: trimmedName,
      email: trimmedEmail,
      phone: trimmedPhone,
      business_niche: businessType,
      status: 'subscribed' as const,
      updated_at: new Date().toISOString(),
    }

    const { data: contact, error: upsertError } = await supabase
      .from('contacts')
      .upsert(payload, { onConflict: 'email' })
      .select('*')
      .single()

    if (upsertError || !contact) {
      setSubmitting(false)
      setError('Something went wrong. Please try again.')
      return
    }

    try {
      await runFormSubmitAutomations(contact as Contact)
    } catch (automationError) {
      console.error('Automation run failed', automationError)
    }

    void trackLead({ content_name: 'Waitlist Form' })

    setSubmitting(false)
    setSubmitted(true)
  }

  return (
    <section ref={ref} className={`section waitlist reveal ${className}`}>
      <div className="section-inner waitlist__inner">
        <div className="waitlist__content">
          <p className="waitlist__eyebrow">Early Access</p>
          <h2 className="waitlist__title">
            Be One Of The First Businesses With An{' '}
            <span className="accent">AI Workforce.</span>
          </h2>
          <p className="waitlist__copy">
            SonicRing is being built for local businesses that want to work
            smarter, respond faster, and capture more opportunities.
          </p>
          <p className="waitlist__copy">
            Join the waitlist and be among the first to experience the
            SonicRing workforce.
          </p>

          <div className="waitlist__benefits">
            {benefits.map((benefit) => (
              <div className="waitlist__benefit" key={benefit.title}>
                <span className="waitlist__benefit-icon" aria-hidden="true">
                  <benefit.icon />
                </span>
                <div>
                  <p className="waitlist__benefit-title">{benefit.title}</p>
                  <p className="waitlist__benefit-copy">{benefit.copy}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="waitlist__card">
          <span className="waitlist__card-icon" aria-hidden="true">
            <UsersIcon />
          </span>
          <span className="waitlist__spots" aria-hidden="true">
            <ClockIcon />
            Limited Spots
          </span>

          <h3 className="waitlist__card-title">
            Join The SonicRing <span className="accent">Waitlist</span>
          </h3>
          <p className="waitlist__card-sub">
            Fill out the form below and be the first to know when we launch.
          </p>

          {submitted ? (
            <p className="waitlist__success">
              You&apos;re on the list! We&apos;ll be in touch soon.
            </p>
          ) : (
            <form className="waitlist-form" onSubmit={(e) => void handleSubmit(e)}>
              <label className="waitlist-field">
                <IndustryIcon name="building" className="waitlist-field__icon" />
                <input
                  type="text"
                  placeholder="Business Name"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  required
                  disabled={submitting}
                />
              </label>

              <label className="waitlist-field">
                <MailIcon className="waitlist-field__icon" />
                <input
                  type="email"
                  placeholder="Business Email"
                  value={businessEmail}
                  onChange={(e) => setBusinessEmail(e.target.value)}
                  required
                  disabled={submitting}
                />
              </label>

              <label className="waitlist-field">
                <TagIcon className="waitlist-field__icon" />
                <select
                  value={businessType}
                  onChange={(e) => setBusinessType(e.target.value)}
                  required
                  disabled={submitting}
                >
                  <option value="" disabled>
                    Business Type
                  </option>
                  {industries.map((industry) => (
                    <option key={industry.name} value={industry.name}>
                      {industry.name}
                    </option>
                  ))}
                  <option value="Other">Other</option>
                </select>
              </label>

              <label className="waitlist-field">
                <PhoneIcon className="waitlist-field__icon" />
                <input
                  type="tel"
                  placeholder="Phone Number"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  disabled={submitting}
                />
              </label>

              {error ? <p className="waitlist__error">{error}</p> : null}

              <button
                type="submit"
                className="waitlist-submit"
                disabled={submitting}
              >
                {submitting ? 'Reserving…' : 'Reserve My Spot'}
                <ArrowRightIcon className="waitlist-submit__icon" />
              </button>
            </form>
          )}

          <p className="waitlist__secure">
            <LockIcon className="waitlist__secure-icon" />
            No spam. We will only send important SonicRing updates.
          </p>
        </div>
      </div>
    </section>
  )
}
