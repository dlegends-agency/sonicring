import { useState } from 'react'
import { faqs } from '../data'
import { useReveal } from '../hooks/useReveal'

export function Faq() {
  const { ref, className } = useReveal<HTMLElement>()
  const [openIndex, setOpenIndex] = useState<number | null>(0)

  return (
    <section
      ref={ref}
      className={`section faq section--deep reveal ${className}`}
      aria-labelledby="faq-heading"
    >
      <div className="section-inner">
        <h2 id="faq-heading" className="section-title">
          Frequently Asked <span className="accent">Questions</span>
        </h2>
        <p className="section-copy">
          Everything you need to know about starting your AI team with SonicRing.
        </p>

        <div className="faq-list">
          {faqs.map((item, index) => {
            const isOpen = openIndex === index
            const panelId = `faq-panel-${index}`
            const buttonId = `faq-button-${index}`

            return (
              <div
                key={item.question}
                className={`faq-item${isOpen ? ' is-open' : ''}`}
              >
                <button
                  id={buttonId}
                  type="button"
                  className="faq-question"
                  aria-expanded={isOpen}
                  aria-controls={panelId}
                  onClick={() => setOpenIndex(isOpen ? null : index)}
                >
                  <span>{item.question}</span>
                  <span className="faq-icon" aria-hidden="true">
                    {isOpen ? '−' : '+'}
                  </span>
                </button>
                <div
                  id={panelId}
                  role="region"
                  aria-labelledby={buttonId}
                  className="faq-answer"
                  hidden={!isOpen}
                >
                  <p>{item.answer}</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
