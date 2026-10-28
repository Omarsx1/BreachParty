import { Trophy } from 'lucide-react';
import type { Countdown } from '../../hooks/useCountdown';
import type { LeaderboardEntry } from '../../types/game';
import { Avatar } from '../ui/Avatar';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { TimerBar } from '../ui/TimerBar';

export interface RoundScoreScreenProps {
  leaderboard: LeaderboardEntry[];
  round: number;
  totalRounds: number;
  countdown: Countdown;
  onSkip: () => void;
}

export function RoundScoreScreen({
  leaderboard,
  round,
  totalRounds,
  countdown,
  onSkip,
}: RoundScoreScreenProps) {
  const topScore = Math.max(1, ...leaderboard.map((entry) => entry.score));
  const isFinalRound = round >= totalRounds;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <Badge tone="neon">Tabla de posiciones · Ronda {round} de {totalRounds}</Badge>
          <h1 className="mt-3 flex items-center gap-3 font-display text-4xl font-bold uppercase tracking-[0.08em] lg:text-5xl">
            <Trophy className="size-9 text-amber" />
            {isFinalRound ? 'Última ronda cerrada' : 'Parcial de la partida'}
          </h1>
        </div>
        <div className="w-full max-w-xs">
          <TimerBar {...countdown} label={isFinalRound ? 'Podio en' : 'Siguiente ronda en'} />
        </div>
      </div>

      <Card className="space-y-2">
        {leaderboard.map((entry) => (
          <div
            key={entry.playerId}
            className="animate-rise flex items-center gap-4 rounded-xl px-3 py-2.5"
          >
            <span className="w-8 font-mono text-sm tabular-nums text-muted">
              {String(entry.rank).padStart(2, '0')}
            </span>
            <Avatar seed={entry.playerId} alias={entry.alias} size="md" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-3">
                <p className="truncate text-sm font-semibold text-ink">{entry.alias}</p>
                <p className="font-mono text-sm tabular-nums text-neon">{entry.score} pts</p>
              </div>
              <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-line/60">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-neon/60 to-neon transition-[width] duration-500"
                  style={{ width: `${Math.round((entry.score / topScore) * 100)}%` }}
                />
              </div>
            </div>
          </div>
        ))}
        {leaderboard.length === 0 && (
          <p className="py-8 text-center font-mono text-xs uppercase tracking-[0.2em] text-muted">
            Sin puntajes todavía
          </p>
        )}
      </Card>

      <div className="flex justify-end">
        <Button variant="secondary" size="sm" onClick={onSkip}>
          {isFinalRound ? 'Ver podio' : 'Siguiente ronda'}
        </Button>
      </div>
    </div>
  );
}
