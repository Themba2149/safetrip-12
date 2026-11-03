import type { ChangeEvent } from 'react'

type Props = {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  error?: string
  type?: 'text' | 'tel' | 'email'
  placeholder?: string
  autoComplete?: string
  inputMode?: 'text' | 'tel' | 'numeric' | 'email'
  list?: string
  maxLength?: number
}

export default function TextField({
  id,
  label,
  value,
  onChange,
  error = '',
  type = 'text',
  placeholder,
  autoComplete,
  inputMode,
  list,
  maxLength,
}: Props) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        name={id}
        type={type}
        value={value}
        placeholder={placeholder}
        autoComplete={autoComplete}
        inputMode={inputMode}
        list={list}
        maxLength={maxLength}
        onChange={(event: ChangeEvent<HTMLInputElement>) => onChange(event.target.value)}
        aria-invalid={error ? 'true' : 'false'}
        aria-describedby={error ? `${id}-error` : undefined}
      />
      {error && (
        <p id={`${id}-error`} className="error">
          {error}
        </p>
      )}
    </div>
  )
}