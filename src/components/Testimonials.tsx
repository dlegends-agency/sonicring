import type { CSSProperties } from 'react'
import { testimonialsRowA, testimonialsRowB, type Testimonial } from '../data'
import { useReveal } from '../hooks/useReveal'
import { Starfield } from './Starfield'

const MARQUEE_SEGMENTS = 6

function TestimonialCard({ item }: { item: Testimonial }) {
  return (
    <article className={`testimonial-card testimonial-card--${item.tone}`}>
      <div className="testimonial-card__top">
        <div className="testimonial-card__person">
          <span className="testimonial-card__avatar" aria-hidden="true">
            {item.initials}
          </span>
          <div>
            <p className="testimonial-card__name">{item.name}</p>
            <p className="testimonial-card__handle">{item.handle}</p>
          </div>
        </div>
        <span className="testimonial-card__x" aria-hidden="true">
          ×
        </span>
      </div>
      <p className="testimonial-card__quote">{item.quote}</p>
      <div className="testimonial-card__mark" aria-hidden="true">
        ”
      </div>
    </article>
  )
}

function MarqueeRow({
  items,
  direction,
}: {
  items: Testimonial[]
  direction: 'left' | 'right'
}) {
  const loop = Array.from({ length: MARQUEE_SEGMENTS }, () => items).flat()

  return (
    <div className="testimonials-marquee-row">
      <div className="testimonials-edge testimonials-edge--left" />
      <div className="testimonials-edge testimonials-edge--right" />
      <div
        className={`testimonials-track testimonials-track--${direction}`}
        style={{ '--marquee-segments': MARQUEE_SEGMENTS } as CSSProperties}
      >
        {loop.map((item, index) => (
          <TestimonialCard key={`${item.handle}-${index}`} item={item} />
        ))}
      </div>
    </div>
  )
}

export function Testimonials() {
  const { ref, className } = useReveal<HTMLElement>()

  return (
    <section
      ref={ref}
      className={`section testimonials has-starfield reveal ${className}`}
      aria-labelledby="testimonials-heading"
    >
      <Starfield />
      <div className="section-inner">
        <h2 id="testimonials-heading" className="section-title">
          Trusted by Local <span className="accent">Business Owners</span>
        </h2>
        <p className="section-copy">
          See what owners are saying about running their AI team with SonicRing —
          more follow-ups, fewer missed calls, less busywork.
        </p>
      </div>

      <div className="testimonials-marquee" aria-label="Customer testimonials">
        <MarqueeRow items={testimonialsRowA} direction="right" />
        <MarqueeRow items={testimonialsRowB} direction="left" />
      </div>
    </section>
  )
}
