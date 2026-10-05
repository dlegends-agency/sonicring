import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import { industries } from '../data'
import { runFormSubmitAutomations } from '../lib/automationEngine'
import { supabase, type Contact } from '../lib/supabase'
import { trackLead } from '../lib/tracking'

type OptinModalProps = {
  open: boolean
  onClose: () => void
}

export function OptinModal({ open, onClose }: OptinModalProps) {
  const titleId = useId()
  const firstInputRef = useRef<HTMLInputElement>(null)
  const [businessName, setBusinessName] = useState('')
  const [businessEmail, setBusinessEmail] = useState('')
  const [businessType, setBusinessType] = useState('')
  const [phone, setPhone] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }

    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKeyDown)

    const focusTimer = window.setTimeout(() => {
      firstInputRef.current?.focus()
    }, 80)

    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', onKeyDown)
      window.clearTimeout(focusTimer)
    }
  }, [open, onClose])

  useEffect(() => {
    if (!open) {
      const resetTimer = window.setTimeout(() => {
        setSubmitting(false)
        setSubmitted(false)
        setError('')
        setBusinessName('')
        setBusinessEmail('')
        setBusinessType('')
        setPhone('')
      }, 220)
      return () => window.clearTimeout(resetTimer)
    }
  }, [open])

  if (!open) return null

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

    void trackLead({ content_name: 'Waitlist Popup' })

    setSubmitting(false)
    setSubmitted(true)
  }

  return (
    <div
      className="optin-overlay"
      role="presentation"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div
        className="optin-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className="optin-modal__glow" aria-hidden="true" />

        <button
          type="button"
          className="optin-close"
          aria-label="Close"
          onClick={onClose}
        >
          <span aria-hidden="true">×</span>
        </button>

        <p className="optin-brand">SonicRing</p>
        <p className="optin-kicker">Be part of what&apos;s next!</p>
        <h2 id={titleId} className="optin-title">
          Join The SonicRing <span className="accent">Waitlist</span>
        </h2>
        <p className="optin-sub">
          Fill out the form below and be the first to know when we launch.
        </p>

        {submitted ? (
          <p className="optin-success">
            You&apos;re on the list! We&apos;ll be in touch soon.
          </p>
        ) : (
          <form className="optin-form" onSubmit={handleSubmit}>
            <label className="optin-field">
              <span>
                Business Name<span className="req">*</span>
              </span>
              <input
                ref={firstInputRef}
                type="text"
                name="businessName"
                placeholder="Your business name"
                value={businessName}
                onChange={(event) => setBusinessName(event.target.value)}
                required
                autoComplete="organization"
                disabled={submitting}
              />
            </label>

            <label className="optin-field">
              <span>
                Business Email<span className="req">*</span>
              </span>
              <input
                type="email"
                name="businessEmail"
                placeholder="you@business.com"
                value={businessEmail}
                onChange={(event) => setBusinessEmail(event.target.value)}
                required
                autoComplete="email"
                disabled={submitting}
              />
            </label>

            <label className="optin-field">
              <span>
                Business Type<span className="req">*</span>
              </span>
              <select
                name="businessType"
                value={businessType}
                onChange={(event) => setBusinessType(event.target.value)}
                required
                disabled={submitting}
              >
                <option value="" disabled>
                  Select your business type
                </option>
                {industries.map((industry) => (
                  <option key={industry.name} value={industry.name}>
                    {industry.name}
                  </option>
                ))}
                <option value="Other">Other</option>
              </select>
            </label>

            <label className="optin-field">
              <span>
                Phone Number<span className="req">*</span>
              </span>
              <input
                type="tel"
                name="phone"
                placeholder="+1 555 000 0000"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                required
                autoComplete="tel"
                disabled={submitting}
              />
            </label>

            {error ? <p className="optin-error">{error}</p> : null}

            <button type="submit" className="optin-submit" disabled={submitting}>
              <span>{submitting ? 'Reserving…' : 'Reserve My Spot'}</span>
              <span className="optin-submit__shine" aria-hidden="true" />
            </button>
          </form>
        )}

        <p className="optin-secure">
          <svg
            className="optin-secure__icon"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              fill="currentColor"
              d="M12 1a5 5 0 0 0-5 5v3H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2h-1V6a5 5 0 0 0-5-5zm-3 8V6a3 3 0 1 1 6 0v3H9zm3 4a1.5 1.5 0 0 1 .75 2.8V18h-1.5v-2.2A1.5 1.5 0 0 1 12 13z"
            />
          </svg>
          No spam. We will only send important SonicRing updates.
        </p>
      </div>
    </div>
  )
}
