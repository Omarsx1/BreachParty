import { cn } from './cn';

export interface TimerBarProps {
  remainingMs: number | null;
  progress: number;
  seconds: number;
  urgent?: boolean;
  label?: string;
  className?: string;
}

export function TimerBar({
  remainingMs,
  progress,
  seconds,
  urgent = false,
  label = 'Tiempo',
  className,
}: TimerBarProps) {
  const idle = remainingMs === null;
  const width = `${Math.round(Math.min(1, Math.max(0, progress)) * 100)}%`;

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between font-mono text-xs uppercase tracking-[0.22em] text-muted">
        <span>{label}</span>
        <span
          className={cn(
            'text-lg tabular-nums tracking-normal',
            idle ? 'text-muted' : urgent ? 'animate-tick text-danger' : 'text-ink',
          )}
        >
          {idle ? '--' : `${seconds}s`}
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-line/70">
        <div
          className={cn(
            'h-full rounded-full transition-[width] duration-200 ease-linear',
            urgent ? 'bg-danger' : 'bg-neon',
          )}
          style={{ width }}
        />
      </div>
    </div>
  );
}
