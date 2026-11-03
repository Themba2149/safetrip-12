import { STEPS } from '../data/onboarding'

type Props = {
  current: number
  /** Steps up to this index may be opened by clicking. */
  reachable: number
  onGo: (index: number) => void
}

export default function StepProgress({ current, reachable, onGo }: Props) {
  return (
    <nav className="ob-progress" aria-label="Application steps">
      <p className="ob-progress-count">
        Step {current + 1} of {STEPS.length}: <strong>{STEPS[current].label}</strong>
      </p>
      <ol className="ob-steps">
        {STEPS.map((step, index) => {
          const state = index < current ? 'done' : index === current ? 'current' : 'todo'
          return (
            <li key={step.key} className={`ob-step ob-step-${state}`}>
              <button
                type="button"
                className="ob-step-button"
                disabled={index > reachable}
                aria-current={index === current ? 'step' : undefined}
                onClick={() => onGo(index)}
              >
                <span className="ob-step-dot" aria-hidden="true">
                  {state === 'done' ? '✓' : index + 1}
                </span>
                <span className="ob-step-label">{step.label}</span>
              </button>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
