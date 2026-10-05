import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { supabase, type Contact } from '../lib/supabase'
import './CheckoutPage.css'
import './OnboardingPage.css'

const INDUSTRY_OPTIONS = [
  'Roofing Contractors/Companies',
  'HVAC Contractors',
  'Plumbing Companies',
  'Electricians',
  'General Contractors',
  'Remodeling Contractors',
  'House Cleaning Services',
  'Landscaping Companies',
  'Tree Service Companies',
  'Pest Control Companies',
  'Painting Contractors',
  'Flooring Contractors',
  'Concrete Contractors',
  'Fence Contractors',
  'Deck Builders',
  'Garage Door Repair',
  'Window & Door Installers',
  'Siding Contractors',
  'Kitchen Remodeling',
  'Bathroom Remodeling',
  'Foundation Repair',
  'Water Damage Restoration',
  'Other',
]

const GOAL_OPTIONS = [
  'Get More Leads',
  'Book More Appointments',
  'Follow Up With Customers',
  'Marketing & Social Media',
  'SEO & Google',
  'Customer Support',
  'Automate Business Tasks',
]

const BUILD_STEPS = [
  'Business profile created',
  'AI CEO created',
  'AI workforce assigned',
  'Initial opportunities analyzed',
  'First missions prepared',
]

type Phase = 'loading' | 'business' | 'goals' | 'confirm' | 'building' | 'ready' | 'error'

function ProgressBar({ current }: { current: 1 | 2 | 3 }) {
  const steps: { id: 1 | 2 | 3; label: string }[] = [
    { id: 1, label: 'Business' },
    { id: 2, label: 'Goals' },
    { id: 3, label: 'AI Team' },
  ]
  return (
    <ol className="ob-progress" aria-label="Onboarding progress">
      {steps.map((step) => (
        <li
          key={step.id}
          className={
            step.id === current
              ? 'is-active'
              : step.id < current
                ? 'is-done'
                : undefined
          }
        >
          <span className="ob-progress__dot">
            {step.id < current ? '✓' : step.id}
          </span>
          <span className="ob-progress__label">{step.label}</span>
        </li>
      ))}
    </ol>
  )
}

export function OnboardingPage() {
  const [params] = useSearchParams()
  const contactId = params.get('contact')
  const navigate = useNavigate()

  const [phase, setPhase] = useState<Phase>('loading')
  const [contact, setContact] = useState<Contact | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [businessName, setBusinessName] = useState('')
  const [website, setWebsite] = useState('')
  const [location, setLocation] = useState('')
  const [industry, setIndustry] = useState('')

  const [goals, setGoals] = useState<string[]>([])
  const [priority, setPriority] = useState('')

  const [buildStepsDone, setBuildStepsDone] = useState(0)

  useEffect(() => {
    if (!contactId) {
      setPhase('error')
      return
    }
    let cancelled = false

    const load = async () => {
      const { data } = await supabase
        .from('contacts')
        .select('*')
        .eq('id', contactId)
        .maybeSingle()
      if (cancelled) return
      if (!data) {
        setPhase('error')
        return
      }
      const loaded = data as Contact
      setContact(loaded)
      setBusinessName(loaded.company || '')
      setWebsite(loaded.business_website || '')
      setLocation(loaded.business_location || '')
      setIndustry(loaded.business_niche || '')
      setGoals(loaded.business_goals || [])
      setPriority(loaded.business_goal || '')

      if (loaded.onboarded_at) {
        navigate(`/mission-control?contact=${contactId}`, { replace: true })
        return
      }
      if (loaded.onboarding_step >= 2) setPhase('confirm')
      else if (loaded.onboarding_step >= 1) setPhase('goals')
      else setPhase('business')
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [contactId, navigate])

  const saveBusinessStep = async () => {
    setError('')
    if (!businessName.trim() || !location.trim() || !industry) {
      setError('Please fill in the required fields to continue.')
      return
    }
    if (!contactId) return
    setSaving(true)
    const { error: updateError } = await supabase
      .from('contacts')
      .update({
        company: businessName.trim(),
        business_website: website.trim(),
        business_location: location.trim(),
        business_niche: industry,
        onboarding_step: 1,
        updated_at: new Date().toISOString(),
      })
      .eq('id', contactId)
    setSaving(false)
    if (updateError) {
      setError('Could not save. Please try again.')
      return
    }
    setPhase('goals')
  }

  const toggleGoal = (goal: string) => {
    setGoals((prev) =>
      prev.includes(goal) ? prev.filter((g) => g !== goal) : [...prev, goal],
    )
  }

  const saveGoalsStep = async () => {
    setError('')
    if (goals.length === 0 || !priority) {
      setError('Pick at least one focus area and your biggest priority.')
      return
    }
    if (!contactId) return
    setSaving(true)
    const { error: updateError } = await supabase
      .from('contacts')
      .update({
        business_goals: goals,
        business_goal: priority,
        onboarding_step: 2,
        updated_at: new Date().toISOString(),
      })
      .eq('id', contactId)
    setSaving(false)
    if (updateError) {
      setError('Could not save. Please try again.')
      return
    }
    setPhase('confirm')
  }

  const buildAiTeam = async () => {
    if (!contactId) return
    setPhase('building')
    setBuildStepsDone(0)

    for (let i = 0; i < BUILD_STEPS.length; i += 1) {
      await new Promise((resolve) => setTimeout(resolve, 650))
      setBuildStepsDone(i + 1)
    }

    await supabase
      .from('contacts')
      .update({
        onboarding_step: 3,
        onboarded_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', contactId)

    setPhase('ready')
  }

  if (phase === 'loading') {
    return (
      <main className="checkout thankyou">
        <div className="thankyou__inner">
          <p className="checkout__brand">SonicRing</p>
          <p className="thankyou__lead">Loading your setup…</p>
        </div>
      </main>
    )
  }

  if (phase === 'error' || !contact) {
    return (
      <main className="checkout checkout--status">
        <div className="checkout__inner checkout__status-card">
          <p className="checkout__brand">SonicRing</p>
          <h1 className="checkout__title">We couldn&apos;t find your order</h1>
          <p className="checkout__sub">
            Use the link from your confirmation email, or contact support.
          </p>
          <Link to="/" className="checkout__cta checkout__cta--link">
            Back to home
          </Link>
        </div>
      </main>
    )
  }

  if (phase === 'building') {
    return (
      <main className="checkout thankyou">
        <div className="checkout__glow" aria-hidden="true" />
        <div className="thankyou__inner">
          <p className="checkout__brand">SonicRing</p>
          <h1 className="thankyou__title">Building Your AI Team...</h1>
          <ul className="ob-build-list">
            {BUILD_STEPS.map((label, index) => (
              <li key={label} className={index < buildStepsDone ? 'is-done' : ''}>
                <span className="ob-build-list__mark" aria-hidden="true">
                  {index < buildStepsDone ? '✓' : ''}
                </span>
                {label}
              </li>
            ))}
          </ul>
        </div>
      </main>
    )
  }

  if (phase === 'ready') {
    return (
      <main className="checkout thankyou">
        <div className="checkout__glow" aria-hidden="true" />
        <div className="thankyou__inner">
          <p className="checkout__brand">SonicRing</p>
          <div className="thankyou__icon" aria-hidden="true">
            ✓
          </div>
          <h1 className="thankyou__title">Your AI team is ready.</h1>
          <Link
            to={`/mission-control?contact=${contactId}`}
            className="checkout__cta checkout__cta--link"
          >
            Enter Mission Control →
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className="checkout thankyou">
      <div className="checkout__glow" aria-hidden="true" />
      <div className="thankyou__inner ob-inner">
        <p className="checkout__brand">SonicRing</p>
        <ProgressBar current={phase === 'business' ? 1 : phase === 'goals' ? 2 : 3} />

        {phase === 'business' ? (
          <>
            <h1 className="thankyou__title">Tell us about your business</h1>
            <p className="thankyou__lead ob-sub">
              We&apos;ll use this information to set up your AI team.
            </p>

            <form
              className="onboard-form"
              onSubmit={(e) => {
                e.preventDefault()
                void saveBusinessStep()
              }}
            >
              <label className="onboard-form__field">
                <span>Business Name *</span>
                <input
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="Carpet Cleaning Hamilton"
                  required
                />
              </label>

              <label className="onboard-form__field">
                <span>Business Website</span>
                <input
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder="yourbusiness.com"
                />
              </label>

              <label className="onboard-form__field">
                <span>Business Location *</span>
                <input
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="City, State/Province, Country"
                  required
                />
              </label>

              <label className="onboard-form__field">
                <span>Industry *</span>
                <select
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  required
                >
                  <option value="" disabled>
                    Select your industry
                  </option>
                  {INDUSTRY_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>

              {error ? <p className="checkout__error">{error}</p> : null}

              <button type="submit" className="checkout__cta" disabled={saving}>
                {saving ? 'Saving…' : 'Continue →'}
              </button>
            </form>
          </>
        ) : null}

        {phase === 'goals' ? (
          <>
            <h1 className="thankyou__title">What do you want AI to help with?</h1>
            <p className="thankyou__lead ob-sub">
              Choose the areas where you want your AI team to focus.
            </p>

            <div className="ob-goal-grid" role="group" aria-label="Focus areas">
              {GOAL_OPTIONS.map((goal) => {
                const checked = goals.includes(goal)
                return (
                  <button
                    key={goal}
                    type="button"
                    className={`ob-goal-card${checked ? ' is-selected' : ''}`}
                    aria-pressed={checked}
                    onClick={() => toggleGoal(goal)}
                  >
                    <span className="ob-goal-card__check" aria-hidden="true">
                      {checked ? '✓' : ''}
                    </span>
                    {goal}
                  </button>
                )
              })}
            </div>

            <label className="onboard-form__field ob-priority">
              <span>What&apos;s your biggest priority?</span>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                required
              >
                <option value="" disabled>
                  Select your biggest priority
                </option>
                {GOAL_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>

            {error ? <p className="checkout__error">{error}</p> : null}

            <div className="ob-actions">
              <button
                type="button"
                className="ob-back"
                onClick={() => setPhase('business')}
              >
                ← Back
              </button>
              <button
                type="button"
                className="checkout__cta"
                disabled={saving}
                onClick={() => void saveGoalsStep()}
              >
                {saving ? 'Saving…' : 'Continue →'}
              </button>
            </div>
          </>
        ) : null}

        {phase === 'confirm' ? (
          <>
            <h1 className="thankyou__title">Your AI Business Setup</h1>

            <dl className="ob-summary">
              <div>
                <dt>Business</dt>
                <dd>{businessName}</dd>
              </div>
              <div>
                <dt>Website</dt>
                <dd>{website || '—'}</dd>
              </div>
              <div>
                <dt>Location</dt>
                <dd>{location}</dd>
              </div>
              <div>
                <dt>Industry</dt>
                <dd>{industry}</dd>
              </div>
              <div>
                <dt>Main Goals</dt>
                <dd>{goals.join(', ')}</dd>
              </div>
            </dl>

            <p className="thankyou__copy">
              Your AI CEO will use this information to build your initial AI
              workforce and recommend your first missions.
            </p>

            <div className="ob-actions">
              <button
                type="button"
                className="ob-back"
                onClick={() => setPhase('goals')}
              >
                ← Back
              </button>
              <button
                type="button"
                className="checkout__cta"
                onClick={() => void buildAiTeam()}
              >
                Build My AI Team →
              </button>
            </div>
          </>
        ) : null}
      </div>
    </main>
  )
}
