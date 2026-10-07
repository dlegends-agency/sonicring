import { useReveal } from '../hooks/useReveal'

const tiers = [
  {
    label: 'Starter',
    price: '$299',
    title: 'Get The Front Desk.',
    copy: '5 AI employees · 5,000 credits · 100 phone minutes.',
  },
  {
    label: 'Growth / Anchor Plan',
    price: '$499',
    title: 'Connect The Engine.',
    copy: '8 AI employees · 20,000 credits · 500 phone minutes.',
    highlight: true,
  },
  {
    label: 'Pro',
    price: '$799',
    title: 'Run At Greater Scale.',
    copy: '10 AI employees · 75,000 credits · 2,000 phone minutes.',
  },
]

export function PricingLadder() {
  const { ref, className } = useReveal<HTMLElement>()

  return (
    <section ref={ref} className={`section pricing-ladder-section reveal ${className}`}>
      <div className="section-inner">
        <p className="section-eyebrow">A practical commercial ladder</p>
        <h2 className="section-title">
          LAND. PROVE.
          <br />
          <span className="accent">EXPAND.</span>
        </h2>

        <div className="pricing-ladder">
          {tiers.map((tier) => (
            <div
              className={`pricing-ladder__card${tier.highlight ? ' pricing-ladder__card--highlight' : ''}`}
              key={tier.label}
            >
              <span className="pricing-ladder__label">{tier.label}</span>
              <p className="pricing-ladder__price">
                {tier.price}
                <span>/ month</span>
              </p>
              <h3>{tier.title}</h3>
              <p className="pricing-ladder__copy">{tier.copy}</p>
            </div>
          ))}
        </div>

        <p className="pricing-ladder__footnote">
          Enterprise custom; usage-credit add-ons are in the supplied pricing
          sheet. Plan prices are not proof of current paid adoption.
        </p>

        <div className="pricing-ladder__flow">
          <img
            src="/images/sonicring-customer-flow.svg"
            alt="SonicRing connects phone calls, SMS texts, emails, website leads, Facebook messages and Google Business to booking appointments, capturing leads, answering customer questions and helping you grow"
            width={2084}
            height={754}
            loading="lazy"
            decoding="async"
          />
        </div>
      </div>
    </section>
  )
}
