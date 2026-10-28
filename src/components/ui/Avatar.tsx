import { cn } from './cn';

export interface AvatarProps {
  seed: string;
  alias: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const SIZES = {
  sm: 'size-8 text-xs rounded-lg',
  md: 'size-10 text-xs rounded-xl',
  lg: 'size-14 text-base rounded-2xl',
} as const;

function hueFor(seed: string): number {
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) >>> 0;
  }
  return hash % 360;
}

function initialsFor(alias: string): string {
  const trimmed = alias.trim();
  if (trimmed.length === 0) return '??';
  return trimmed.slice(0, 2).toUpperCase();
}

/** Avatar determinista: el mismo jugador siempre recibe el mismo color. */
export function Avatar({ seed, alias, size = 'md', className }: AvatarProps) {
  const hue = hueFor(seed);
  return (
    <span
      aria-hidden="true"
      className={cn(
        'inline-flex shrink-0 items-center justify-center border font-mono font-bold uppercase',
        SIZES[size],
        className,
      )}
      style={{
        borderColor: `hsl(${hue} 90% 62% / 0.55)`,
        backgroundColor: `hsl(${hue} 90% 58% / 0.14)`,
        color: `hsl(${hue} 92% 76%)`,
      }}
    >
      {initialsFor(alias)}
    </span>
  );
}
