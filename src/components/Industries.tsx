import type { CSSProperties } from 'react'
import { industries } from '../data'
import { useReveal } from '../hooks/useReveal'
import { ArrowRightIcon, IndustryIcon } from './Icons'
import { Starfield } from './Starfield'

export function Industries() {
  const { ref, className } = useReveal<HTMLElement>()

  return (
    <section
      ref={ref}
      className={`section industries has-starfield reveal ${className}`}
    >
      <Starfield />
      <div className="section-inner">
        <p className="section-eyebrow">Local Business</p>
        <h2 className="section-title">Built For Local Business</h2>

        <div className="problem__copy">
          <p>
            SonicRing is designed for local businesses that depend on calls,
            leads, appointments, and customer relationships.
          </p>
        </div>

        <p className="industries__label">Perfect for:</p>

        <div className="industries__grid">
          {industries.map((industry, index) => (
            <div
              key={industry.name}
              className="industry"
              style={{ '--i': index } as CSSProperties}
            >
              <span className="industry__shine" aria-hidden="true" />
              <div className="industry__top">
                <span
                  className="industry__badge"
                  style={{ background: industry.color }}
                >
                  <IndustryIcon name={industry.icon} className="industry__icon" />
                </span>
                <span className="industry__arrow" aria-hidden="true">
                  <ArrowRightIcon className="industry__arrow-icon" />
                </span>
              </div>
              <h3>{industry.name}</h3>
              <p>{industry.description}</p>
            </div>
          ))}
        </div>

        <div className="problem__answer">
          <p>
            If customers call you, message you, book with you, or ask
            questions, SonicRing can help keep the conversation moving.
          </p>
        </div>
      </div>
    </section>
  )
}
