import { Wifi, WifiOff } from 'lucide-react';
import type { Player } from '../../types/game';
import { Avatar } from '../ui/Avatar';
import { cn } from '../ui/cn';

export interface PlayerRosterProps {
  players: Player[];
  progressFor?: (player: Player) => number;
  maxProgress?: number;
  emptyLabel?: string;
  columns?: string;
}

export function PlayerRoster({
  players,
  progressFor,
  maxProgress = 2,
  emptyLabel = 'Esperando jugadores…',
  columns,
}: PlayerRosterProps) {
  if (players.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-line px-4 py-10 text-center font-mono text-xs uppercase tracking-[0.2em] text-muted">
        {emptyLabel}
      </p>
    );
  }

  return (
    <div className={cn('grid gap-2', columns ?? 'grid-cols-2 xl:grid-cols-3')}>
      {players.map((player) => (
        <div
          key={player.id}
          className={cn(
            'flex items-center gap-3 rounded-xl border px-3 py-2 transition-colors',
            player.connected
              ? 'border-line/80 bg-panel/60'
              : 'border-line/40 bg-panel/30 opacity-60',
          )}
        >
          <Avatar seed={player.id} alias={player.alias} size="sm" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-semibold text-ink">{player.alias}</p>
            <p className="flex items-center gap-1 font-mono text-xs uppercase tracking-[0.14em] text-muted">
              {player.connected ? (
                <Wifi className="size-3 text-neon" />
              ) : (
                <WifiOff className="size-3" />
              )}
              {progressFor !== undefined
                ? `${progressFor(player)}/${maxProgress} respuestas`
                : `${player.score} pts`}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
