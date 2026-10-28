import { LogOut, ShieldCheck } from 'lucide-react';
import type { RoomCode } from '../../types/game';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';

export interface PlayerHeaderProps {
  alias: string | null;
  roomCode: RoomCode | null;
  score: number;
  showScore: boolean;
  canLeave: boolean;
  onLeave: () => void;
}

export function PlayerHeader({
  alias,
  roomCode,
  score,
  showScore,
  canLeave,
  onLeave,
}: PlayerHeaderProps) {
  return (
    <header className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-line/70 bg-void/85 px-4 py-3 backdrop-blur">
      <div className="flex min-w-0 items-center gap-2">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-neon/40 bg-neon/10">
          <ShieldCheck className="size-4 text-neon" />
        </span>
        <div className="min-w-0">
          <p className="font-display text-xs font-bold uppercase tracking-[0.26em]">BreachParty</p>
          <p className="truncate font-mono text-xs uppercase tracking-[0.14em] text-muted">
            {alias ?? 'Invitado'}
            {roomCode !== null ? ` · ${roomCode}` : ''}
          </p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {showScore && <Badge tone="amber">{score} pts</Badge>}
        {canLeave && (
          <Button variant="ghost" size="sm" onClick={onLeave} aria-label="Salir de la sala">
            <LogOut className="size-4" />
          </Button>
        )}
      </div>
    </header>
  );
}
