import type { CSSProperties } from 'react'
import { CtaButton } from './CtaButton'

type HeroProps = {
  onCtaClick: () => void
}

export function Hero({ onCtaClick }: HeroProps) {
  return (
    <section className="hero">
      <div className="hero__atmos" aria-hidden="true" />
      <div className="hero__inner section-inner">
        <div className="hero__content">
          <div
            className="hero__brand reveal-item"
            style={{ '--d': '0ms' } as CSSProperties}
          >
            <img
              src="/images/sonicring-logo.webp"
              alt="SonicRing"
              width={1224}
              height={410}
            />
          </div>
          <p
            className="hero__eyebrow reveal-item"
            style={{ '--d': '80ms' } as CSSProperties}
          >
            The operating system after software
          </p>
          <h1
            className="hero__title reveal-item"
            style={{ '--d': '160ms' } as CSSProperties}
          >
            STOP MANAGING
            <br />
            SOFTWARE.
            <br />
            <span className="accent">
              START
              <br />
              DIRECTING.
            </span>
          </h1>
          <p
            className="hero__copy reveal-item"
            style={{ '--d': '320ms' } as CSSProperties}
          >
            SonicRing turns scattered business tools into a coordinated AI
            workforce—visible, accountable and built to move customers from
            inquiry to action.
          </p>
          <div
            className="hero__cta reveal-item"
            style={{ '--d': '400ms' } as CSSProperties}
          >
            <CtaButton onClick={onCtaClick} />
          </div>
        </div>
        <div className="hero__image-wrap" aria-hidden="true">
          <img
            className="hero__image"
            src="/images/ai3doffice.webp"
            alt=""
            width={1224}
            height={1152}
          />
        </div>
      </div>
    </section>
  )
}
