import { CAR_CHECK_ITEMS } from '../data/roadSafety'
import type { CarAnswer, CarAnswers, CarCheckKey } from '../data/roadSafety'

type Props = {
  answers: CarAnswers
  onChange: (key: CarCheckKey, answer: CarAnswer) => void
}

export default function CarCheck({ answers, onChange }: Props) {
  function pick(key: CarCheckKey, answer: 'good' | 'attention') {
    // Pressing the same button again clears the answer.
    onChange(key, answers[key] === answer ? null : answer)
  }

  return (
    <fieldset className="car-check">
      <legend>Quick car check (optional)</legend>
      <p className="muted small-print">
        Takes a minute. Anything that needs attention raises the vehicle risk in your advice.
      </p>
      <ul>
        {CAR_CHECK_ITEMS.map((item) => (
          <li key={item.key}>
            <div className="car-check-text">
              <strong>{item.label}</strong>
              <span className="muted">{item.hint}</span>
            </div>
            <div className="pick-group" role="group" aria-label={`${item.label} status`}>
              <button
                type="button"
                className={answers[item.key] === 'good' ? 'pick on good' : 'pick'}
                aria-pressed={answers[item.key] === 'good' ? 'true' : 'false'}
                onClick={() => pick(item.key, 'good')}
              >
                All good
              </button>
              <button
                type="button"
                className={answers[item.key] === 'attention' ? 'pick on attention' : 'pick'}
                aria-pressed={answers[item.key] === 'attention' ? 'true' : 'false'}
                onClick={() => pick(item.key, 'attention')}
              >
                Needs attention
              </button>
            </div>
          </li>
        ))}
      </ul>
    </fieldset>
  )
}