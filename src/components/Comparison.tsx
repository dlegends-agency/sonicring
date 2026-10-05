import { bossLabBenefits, traditionalHiring } from '../data'
import { useReveal } from '../hooks/useReveal'
import { ArrowRightIcon, CheckCircleIcon, CloseCircleIcon } from './Icons'

export function Comparison() {
  const { ref, className } = useReveal<HTMLElement>()

  return (
    <section
      ref={ref}
      className={`section comparison section--deep reveal ${className}`}
    >
      <div className="section-inner">
        <p className="section-eyebrow">The Difference</p>
        <h2 className="section-title">
          What Changes When Your Business Has An{' '}
          <span className="accent">AI Workforce?</span>
        </h2>
        <p className="section-copy">Same business. A smarter way to work.</p>

        <div className="comparison__grid">
          <div className="comparison__col comparison__col--muted">
            <span className="comparison__badge">Before SonicRing</span>
            <h3>
              More Stress.
              <br />
              More Missed Opportunities.
            </h3>
            <div className="comparison__body">
              <ul>
                {traditionalHiring.map((item) => (
                  <li key={item}>
                    <CloseCircleIcon className="comparison__icon" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <span className="comparison__connector" aria-hidden="true">
            <ArrowRightIcon />
          </span>

          <div className="comparison__col comparison__col--accent">
            <span className="comparison__badge comparison__badge--accent">
              After SonicRing
            </span>
            <h3>
              More Time.
              <br />
              <span className="accent">More Growth.</span>
            </h3>
            <div className="comparison__body">
              <ul>
                {bossLabBenefits.map((item) => (
                  <li key={item}>
                    <CheckCircleIcon className="comparison__icon" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
