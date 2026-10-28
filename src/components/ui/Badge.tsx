import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from './cn';

export type BadgeTone = 'neon' | 'magenta' | 'amber' | 'danger' | 'muted';

const TONES: Record<BadgeTone, string> = {
  neon: 'border-neon/40 bg-neon/10 text-neon',
  magenta: 'border-magenta/40 bg-magenta/10 text-magenta',
  amber: 'border-amber/40 bg-amber/10 text-amber',
  danger: 'border-danger/50 bg-danger/10 text-danger',
  muted: 'border-line bg-white/[0.03] text-muted',
};

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
  children: ReactNode;
}

export function Badge({ tone = 'muted', className, children, ...rest }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-xs uppercase tracking-[0.18em]',
        TONES[tone],
        className,
      )}
      {...rest}
    >
      {children}
    </span>
  );
}
