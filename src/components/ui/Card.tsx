import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from './cn';

export type CardTone = 'default' | 'neon' | 'magenta' | 'amber' | 'danger';

const TONES: Record<CardTone, string> = {
  default: 'border-line/80 bg-panel/70',
  neon: 'border-neon/45 bg-neon/[0.04] shadow-[0_0_44px_-16px_var(--color-neon)]',
  magenta: 'border-magenta/45 bg-magenta/[0.04] shadow-[0_0_44px_-16px_var(--color-magenta)]',
  amber: 'border-amber/45 bg-amber/[0.04]',
  danger: 'border-danger/55 bg-danger/10',
};

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  tone?: CardTone;
  padded?: boolean;
  children: ReactNode;
}

export function Card({ tone = 'default', padded = true, className, children, ...rest }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-2xl border backdrop-blur-sm transition-colors',
        TONES[tone],
        padded && 'p-5',
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}
