import type { CSSProperties } from 'react'
import { useReveal } from '../hooks/useReveal'
import { CheckCircleIcon } from './Icons'
import { CtaButton } from './CtaButton'

const officeChecklist = [
  'Voice',
  'Qualification',
  'Booking',
  'Follow-up',
  'Owner visibility',
]

type DashboardProps = {
  onCtaClick: () => void
}

export function Dashboard({ onCtaClick }: DashboardProps) {
  const { ref, className } = useReveal<HTMLElement>()

  return (
    <section ref={ref} className={`section section--deep ai-dashboard reveal ${className}`}>
      <div className="section-inner">
        <h2 className="section-title">
          MEET YOUR <span className="accent">ALWAYS-ON</span> FRONT OFFICE.
        </h2>

        <div className="problem__copy">
          <p>
            One command view. Multiple specialized roles. A shared
            understanding of how your business actually works.
          </p>
        </div>

        <div className="checklist-row">
          <div className="checklist-row__media">
            <img
              src="/images/sonicring-ai-meeting.webp"
              alt="AI CEO leading a SonicRing meeting with AI Sales, Marketing, Designer, Receptionist, Scheduler, Support, and Research employees around a table"
              width={1672}
              height={941}
            />
          </div>
          <ul className="pain-list pain-list--positive checklist-row__list">
            {officeChecklist.map((item, index) => (
              <li key={item} style={{ '--i': index } as CSSProperties}>
                <CheckCircleIcon className="pain-list__icon" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="problem__copy">
          <p>INTERFACE VISUALIZATION &middot; NOT A LIVE SCREENSHOT</p>
        </div>

        <CtaButton onClick={onCtaClick} />
      </div>
    </section>
  )
}
