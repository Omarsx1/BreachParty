import { useId } from 'react';
import type { InputHTMLAttributes, ReactNode } from 'react';
import { cn } from './cn';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
  leading?: ReactNode;
}

export function Input({
  label,
  hint,
  error,
  leading,
  className,
  id,
  ...rest
}: InputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;

  return (
    <div className="space-y-2">
      {label !== undefined && (
        <label
          htmlFor={inputId}
          className="block font-mono text-xs uppercase tracking-[0.2em] text-muted"
        >
          {label}
        </label>
      )}
      <div className="relative">
        {leading !== undefined && (
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted">
            {leading}
          </span>
        )}
        <input
          id={inputId}
          aria-invalid={error !== undefined ? true : undefined}
          className={cn(
            'h-12 w-full rounded-xl border bg-void/70 px-4 font-mono text-ink placeholder:text-muted/50 focus:outline-none focus:ring-2 focus:ring-neon/30',
            error !== undefined ? 'border-danger' : 'border-line focus:border-neon',
            leading !== undefined && 'pl-10',
            className,
          )}
          {...rest}
        />
      </div>
      {error !== undefined ? (
        <p className="text-sm text-danger">{error}</p>
      ) : hint !== undefined ? (
        <p className="text-sm text-muted">{hint}</p>
      ) : null}
    </div>
  );
}
