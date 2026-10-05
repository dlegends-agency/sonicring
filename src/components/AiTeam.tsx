import { useReveal } from '../hooks/useReveal'

export function AiTeam() {
  const { ref, className } = useReveal<HTMLElement>()

  return (
    <section ref={ref} className={`section section--deep ai-team reveal ${className}`}>
      <div className="section-inner">
        <p className="section-eyebrow">Change the frame. Change the category.</p>
        <h2 className="section-title">
          ANOTHER DASHBOARD IS
          <br />
          <span className="accent">NOT ANOTHER EMPLOYEE.</span>
        </h2>

        <div className="problem__copy">
          <p>
            What if your business had a team that could keep working while
            you focus on running the business?
          </p>
          <p>
            SonicRing connects specialized AI capabilities for reception,
            sales, marketing, support, research, scheduling, and operations
            into one business workforce.
          </p>
          <p>
            Your AI workforce works together, using your business
            information, workflows, and tools to keep work moving.
          </p>
        </div>

        <p className="pivot-text">You set the direction.</p>
        <p className="pivot-text">Your AI workforce handles the work.</p>

        <div className="model-shift">
          <div className="model-shift__card">
            <span className="model-shift__label">Old Model</span>
            <h3 className="model-shift__word">Tools</h3>
            <p>More tabs. More configuration. More work for the owner.</p>
          </div>
          <div className="model-shift__card model-shift__card--highlight">
            <span className="model-shift__label model-shift__label--accent">
              The Shift
            </span>
            <h3 className="model-shift__word accent">Action</h3>
            <p>Agents carry work forward, with rules, handoffs and visibility.</p>
          </div>
          <div className="model-shift__card">
            <span className="model-shift__label model-shift__label--accent">
              New Role
            </span>
            <h3 className="model-shift__word accent">Leader</h3>
            <p>The owner sets priorities, reviews exceptions and sees outcomes.</p>
          </div>
        </div>

        <div className="section-media">
          <img
            src="/images/sonicring-ai-team.webp"
            alt="Business owner with SonicRing AI employee robots for reception, sales, marketing, analytics, and research"
            width={1536}
            height={1024}
          />
        </div>
      </div>
    </section>
  )
}
