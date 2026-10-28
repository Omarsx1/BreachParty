import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from './cn';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'vote';
export type ButtonSize = 'sm' | 'md' | 'lg' | 'xl';

const BASE =
  'inline-flex select-none items-center justify-center gap-2 rounded-xl font-display font-semibold uppercase tracking-[0.14em] transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neon focus-visible:ring-offset-2 focus-visible:ring-offset-void disabled:cursor-not-allowed disabled:opacity-40 active:translate-y-px';

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    'bg-neon text-void shadow-[0_0_28px_-8px_var(--color-neon)] hover:bg-neon/90 hover:shadow-[0_0_38px_-6px_var(--color-neon)]',
  secondary:
    'border border-line bg-panel/80 text-ink hover:border-neon/60 hover:text-neon',
  ghost: 'text-muted hover:bg-white/5 hover:text-ink',
  danger: 'bg-danger text-void hover:bg-danger/90',
  vote: 'border border-line bg-panel text-ink hover:border-neon hover:bg-neon/10 hover:text-ink',
};

const SIZES: Record<ButtonSize, string> = {
  sm: 'h-9 px-3 text-xs',
  md: 'h-11 px-5 text-xs',
  lg: 'h-14 px-8 text-sm',
  xl: 'min-h-16 px-6 text-sm',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  children: ReactNode;
}

export function Button({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  className,
  children,
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(BASE, VARIANTS[variant], SIZES[size], fullWidth && 'w-full', className)}
      {...rest}
    >
      {children}
    </button>
  );
}
