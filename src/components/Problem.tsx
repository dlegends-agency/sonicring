import type { CSSProperties } from 'react'
import { painPointsLeft, painPointsRight } from '../data'
import { useReveal } from '../hooks/useReveal'
import { CloseCircleIcon } from './Icons'

export function Problem() {
  const { ref, className } = useReveal<HTMLElement>()

  return (
    <section ref={ref} className={`section problem reveal ${className}`}>
      <div className="section-inner">
        <p className="section-eyebrow">The invisible leak</p>
        <h2 className="section-title">
          THE JOB YOU NEVER
          <br />
          <span className="accent">KNEW YOU LOST.</span>
        </h2>

        <div className="problem__copy">
          <p>
            You&rsquo;re serving a customer when the next call comes in.
            Another lead is waiting. Another appointment needs a response.
          </p>
          <p>
            Your calls, leads, follow-ups, messages, and calendar are
            scattered across different tools. You become the one holding
            everything together.
          </p>
        </div>

        <div className="pain-grid">
          <ul className="pain-list">
            {painPointsLeft.map((item, index) => (
              <li
                key={item}
                style={{ '--i': index } as CSSProperties}
              >
                <CloseCircleIcon className="pain-list__icon" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <ul className="pain-list">
            {painPointsRight.map((item, index) => (
              <li
                key={item}
                style={{ '--i': index + 2 } as CSSProperties}
              >
                <CloseCircleIcon className="pain-list__icon" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="pivot-text">
          Every missed opportunity can become a lost customer.
        </p>

        <div className="problem__copy">
          <p>
            SonicRing helps your business stay available, responsive, and
            ready to serve customers around the clock.
          </p>
        </div>

      </div>
    </section>
  )
}
