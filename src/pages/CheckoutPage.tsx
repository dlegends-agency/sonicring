import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useSearchParams } from 'react-router-dom'
import {
  checkoutPlans,
  formatFeatureValue,
  getCheckoutPlan,
  type CheckoutPlanId,
} from '../data/checkoutPlans'
import { runStripePurchaseAutomations } from '../lib/automationEngine'
import {
  DEFAULT_CHECKOUT_SETTINGS,
  loadCheckoutSettings,
  type CheckoutSettings,
} from '../lib/checkoutSettings'
import {
  DEFAULT_GENERAL_SETTINGS,
  loadGeneralSettings,
  type GeneralSettings,
} from '../lib/generalSettings'
import { supabase, type Contact } from '../lib/supabase'
import { trackAddToCart, trackPurchase } from '../lib/tracking'
import './CheckoutPage.css'

function useCheckoutAndGeneralSettings() {
  const [checkoutSettings, setCheckoutSettings] = useState<CheckoutSettings>(
    DEFAULT_CHECKOUT_SETTINGS,
  )
  const [generalSettings, setGeneralSettings] = useState<GeneralSettings>(
    DEFAULT_GENERAL_SETTINGS,
  )

  useEffect(() => {
    void loadCheckoutSettings().then(setCheckoutSettings)
    void loadGeneralSettings().then(setGeneralSettings)
  }, [])

  return { checkoutSettings, generalSettings }
}

export function CheckoutPage() {
  const [params] = useSearchParams()
  const email = params.get('email') ?? ''
  const name = params.get('name') ?? ''
  const contactId = params.get('contact') ?? ''

  const [selected, setSelected] = useState<CheckoutPlanId>('growth')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { checkoutSettings } = useCheckoutAndGeneralSettings()

  const selectedPlan = useMemo(
    () => checkoutPlans.find((plan) => plan.id === selected)!,
    [selected],
  )

  const startCheckout = async () => {
    setError('')
    setLoading(true)

    void trackAddToCart({
      content_name: selectedPlan.name,
      value: selectedPlan.amountCents / 100,
      currency: 'USD',
    })

    const { data, error: fnError } = await supabase.functions.invoke(
      'create-checkout',
      {
        body: {
          plan: selected,
          email,
          name,
          contactId,
          origin: window.location.origin,
        },
      },
    )

    if (fnError) {
      setLoading(false)
      setError(
        fnError.message.includes('Failed to send') ||
          fnError.message.includes('FunctionsFetchError')
          ? 'Checkout is not ready yet. Add your Stripe test secret key in Supabase (see .env.example).'
          : fnError.message || 'Could not start checkout.',
      )
      return
    }

    const payload = data as { url?: string; error?: string } | null
    if (!payload?.url) {
      setLoading(false)
      setError(payload?.error || 'Could not start Stripe checkout.')
      return
    }

    window.location.assign(payload.url)
  }

  return (
    <main className="checkout">
      <div className="checkout__glow" aria-hidden="true" />
      <div className="checkout__inner">
        <header className="checkout__header">
          <p className="checkout__brand">SonicRing</p>
          <h1 className="checkout__title">{checkoutSettings.page_title}</h1>
          <p className="checkout__sub">
            {name
              ? `Welcome, ${name} — pick the plan that fits your business.`
              : checkoutSettings.page_subtitle}
          </p>
          {email ? <p className="checkout__email">{email}</p> : null}
        </header>

        <div className="checkout__grid" role="radiogroup" aria-label="Plans">
          {checkoutPlans.map((plan) => {
            const isSelected = selected === plan.id
            return (
              <button
                key={plan.id}
                type="button"
                role="radio"
                aria-checked={isSelected}
                className={`checkout-card${plan.featured ? ' is-featured' : ''}${
                  isSelected ? ' is-selected' : ''
                }`}
                onClick={() => setSelected(plan.id)}
              >
                <div className="checkout-card__top">
                  <div className="checkout-card__heading">
                    <span
                      className={`checkout-card__radio${isSelected ? ' is-on' : ''}`}
                      aria-hidden="true"
                    />
                    <h2>{plan.name}</h2>
                  </div>
                  {plan.featured ? (
                    <span className="checkout-card__badge">Most popular</span>
                  ) : null}
                </div>

                <p className="checkout-card__price">
                  {plan.priceLabel}
                  <span>/month</span>
                </p>
                <p className="checkout-card__desc">{plan.description}</p>

                <div className="checkout-card__divider" aria-hidden="true" />

                <ul className="checkout-card__features">
                  {plan.features.map((feature) => {
                    const included =
                      feature.value !== false && feature.value !== ''
                    return (
                      <li
                        key={feature.label}
                        className={included ? undefined : 'is-muted'}
                      >
                        <span className="checkout-card__feature-label">
                          {feature.label}
                        </span>
                        <span className="checkout-card__feature-value">
                          {formatFeatureValue(feature.value)}
                        </span>
                      </li>
                    )
                  })}
                </ul>
              </button>
            )
          })}
        </div>

        <div className="checkout__footer">
          {error ? <p className="checkout__error">{error}</p> : null}

          <button
            type="button"
            className="checkout__cta"
            onClick={() => void startCheckout()}
            disabled={loading}
          >
            {loading
              ? 'Redirecting to Stripe…'
              : `Continue with ${selectedPlan.name} — ${selectedPlan.priceLabel}/mo`}
          </button>

          <p className="checkout__secure">
            Secure checkout powered by Stripe (test mode). Cancel anytime.
            {checkoutSettings.show_terms_link ? (
              <>
                {' '}
                <Link to="/terms-and-conditions">Terms &amp; Conditions</Link>
              </>
            ) : null}
          </p>
          <Link to="/" className="checkout__back">
            ← Back to home
          </Link>
        </div>
      </div>
    </main>
  )
}

export function CheckoutSuccessPage() {
  const [params] = useSearchParams()
  const plan = params.get('plan')
  const contactId = params.get('contact')

  const [destination, setDestination] = useState<string | null>(null)
  const { checkoutSettings, generalSettings } = useCheckoutAndGeneralSettings()
  const supportEmail =
    checkoutSettings.support_email_override || generalSettings.support_email

  useEffect(() => {
    if (!contactId) return
    let cancelled = false

    const run = async () => {
      const planMeta = getCheckoutPlan(plan)
      if (planMeta) {
        await supabase
          .from('contacts')
          .update({
            order_plan: planMeta.name,
            total_revenue: planMeta.amountCents / 100,
            updated_at: new Date().toISOString(),
          })
          .eq('id', contactId)

        const purchaseKey = `tracked_purchase_${contactId}_${planMeta.id}`
        if (!sessionStorage.getItem(purchaseKey)) {
          sessionStorage.setItem(purchaseKey, '1')
          void trackPurchase({
            value: planMeta.amountCents / 100,
            currency: 'USD',
            content_name: planMeta.name,
            transaction_id: contactId,
          })
        }
      }

      const { data } = await supabase
        .from('contacts')
        .select('*')
        .eq('id', contactId)
        .maybeSingle()
      if (cancelled || !data) return
      const loadedContact = data as Contact
      setDestination(
        loadedContact.onboarded_at
          ? `/mission-control?contact=${contactId}`
          : `/onboarding?contact=${contactId}`,
      )
      await runStripePurchaseAutomations(loadedContact)
    }

    void run()
    return () => {
      cancelled = true
    }
  }, [contactId, plan])

  if (contactId && destination) {
    return <Navigate to={destination} replace />
  }

  if (contactId) {
    return (
      <main className="checkout thankyou">
        <div className="thankyou__inner">
          <p className="checkout__brand">SonicRing</p>
          <p className="thankyou__lead">Confirming your purchase…</p>
        </div>
      </main>
    )
  }

  return (
    <main className="checkout thankyou">
      <div className="checkout__glow" aria-hidden="true" />
      <div className="thankyou__inner">
        <p className="checkout__brand">SonicRing</p>
        <div className="thankyou__icon" aria-hidden="true">
          ✓
        </div>
        <h1 className="thankyou__title">
          <span aria-hidden="true">🎉 </span>Your Purchase Is Successful.
        </h1>
        <p className="thankyou__lead">
          Congratulations — let&apos;s work together for growth!
        </p>
        <p className="thankyou__copy">
          Thank you for joining SONICRING. Your AI workforce is being
          prepared, and you&apos;re one step closer to running your business
          with smarter automation.
        </p>
        <p className="thankyou__closing">
          Please contact support if you don&apos;t hear from us shortly.
          <br />
          <a className="thankyou__support" href={`mailto:${supportEmail}`}>
            {supportEmail}
          </a>
        </p>

        <Link to="/" className="checkout__cta checkout__cta--link">
          Back to home
        </Link>
      </div>
    </main>
  )
}

export function CheckoutCancelPage() {
  const [params] = useSearchParams()
  const email = params.get('email') ?? ''
  const name = params.get('name') ?? ''
  const contact = params.get('contact') ?? ''
  const query = new URLSearchParams({
    ...(email ? { email } : {}),
    ...(name ? { name } : {}),
    ...(contact ? { contact } : {}),
  }).toString()

  return (
    <main className="checkout checkout--status">
      <div className="checkout__inner checkout__status-card">
        <p className="checkout__brand">SonicRing</p>
        <h1 className="checkout__title">Checkout canceled</h1>
        <p className="checkout__sub">
          No charge was made. You can pick a plan whenever you&apos;re ready.
        </p>
        <Link
          to={`/checkout${query ? `?${query}` : ''}`}
          className="checkout__cta checkout__cta--link"
        >
          Choose a plan
        </Link>
      </div>
    </main>
  )
}
