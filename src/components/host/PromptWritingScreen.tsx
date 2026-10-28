import { EyeOff, FileText } from 'lucide-react';
import type { Countdown } from '../../hooks/useCountdown';
import type { Matchup, Player } from '../../types/game';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { TimerBar } from '../ui/TimerBar';
import { PlayerRoster } from './PlayerRoster';

export interface PromptWritingScreenProps {
  players: Player[];
  matchups: Matchup[];
  round: number;
  totalRounds: number;
  countdown: Countdown;
  onSkip: () => void;
}

export function PromptWritingScreen({
  players,
  matchups,
  round,
  totalRounds,
  countdown,
  onSkip,
}: PromptWritingScreenProps) {
  const total = matchups.length * 2;
  const submitted = matchups.reduce((sum, matchup) => sum + matchup.answers.length, 0);
  const progressFor = (player: Player) =>
    matchups.filter((matchup) =>
      matchup.answers.some((answer) => answer.playerId === player.id),
    ).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div className="max-w-2xl">
          <Badge tone="neon">
            Ronda {round} de {totalRounds}
          </Badge>
          <h1 className="mt-3 font-display text-4xl font-bold uppercase tracking-[0.08em] lg:text-5xl">
            Escribiendo respuestas
          </h1>
          <p className="mt-2 text-sm text-muted">
            Cada jugador recibió 2 prompts. Los duelos permanecen ocultos hasta la votación.
          </p>
        </div>
        <div className="w-full max-w-sm">
          <TimerBar {...countdown} label="Cierre de escritura" />
        </div>
      </div>

      <Card className="space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-display text-sm uppercase tracking-[0.18em]">
            <FileText className="size-4 text-neon" />
            Respuestas recibidas
          </h2>
          <Badge tone={submitted === total ? 'neon' : 'muted'}>
            {submitted} / {total}
          </Badge>
        </div>

        <PlayerRoster players={players} progressFor={progressFor} maxProgress={2} />

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line/60 pt-4">
          <p className="flex items-center gap-2 font-mono text-xs uppercase tracking-[0.16em] text-muted">
            <EyeOff className="size-3.5" />
            Ni el host revela autores antes del reveal
          </p>
          <Button variant="secondary" size="sm" onClick={onSkip}>
            Cerrar escritura
          </Button>
        </div>
      </Card>
    </div>
  );
}
