import { useId, type InputHTMLAttributes } from 'react'

interface TextFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'id'> {
  label: string
  error?: string | null
  hint?: string
}

export function TextField({ label, error, hint, className = '', ...rest }: TextFieldProps) {
  const id = useId()
  const messageId = `${id}-pesan`
  const message = error ?? hint
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label htmlFor={id} className="text-sm font-medium text-muted">
        {label}
      </label>
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={message ? messageId : undefined}
        className="min-h-12 rounded-control border border-line bg-surface px-4 text-base text-ink placeholder:text-muted/70 aria-invalid:border-expense"
        {...rest}
      />
      {message && (
        <p id={messageId} className={`text-sm ${error ? 'text-expense' : 'text-muted'}`}>
          {message}
        </p>
      )}
    </div>
  )
}
