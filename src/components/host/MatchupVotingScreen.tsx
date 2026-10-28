import { Gavel, Users } from 'lucide-react';
import type { Countdown } from '../../hooks/useCountdown';
import { answerText, voteCountsFor } from '../../lib/realtime/matchupUtils';
import { eligibleVoterIds } from '../../lib/realtime/view';
import type { Matchup, Player, VoteSlot } from '../../types/game';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { TimerBar } from '../ui/TimerBar';

export interface MatchupVotingScreenProps {
  matchup: Matchup;
  players: Player[];
  index: number;
  total: number;
  countdown: Countdown;
  onSkip: () => void;
}

const SLOT_LABEL: Record<VoteSlot, string> = { A: 'Respuesta A', B: 'Respuesta B' };

export function MatchupVotingScreen({
  matchup,
  players,
  index,
  total,
  countdown,
  onSkip,
}: MatchupVotingScreenProps) {
  const counts = voteCountsFor(matchup);
  const cast = counts.A + counts.B;
  const eligible = eligibleVoterIds({ players }, matchup).length;
  const options: Array<{ slot: VoteSlot; text: string; votes: number }> = [
    { slot: 'A', text: answerText(matchup, matchup.order[0]) ?? '—', votes: counts.A },
    { slot: 'B', text: answerText(matchup, matchup.order[1]) ?? '—', votes: counts.B },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div className="max-w-3xl">
          <Badge tone="magenta">
            Duelo {index} de {total}
          </Badge>
          <h1 className="mt-3 font-display text-3xl font-semibold leading-snug text-ink lg:text-4xl">
            {matchup.prompt}
          </h1>
        </div>
        <div className="w-full max-w-xs">
          <TimerBar {...countdown} label="Votación abierta" />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {options.map((option) => {
          const percent = cast === 0 ? 0 : Math.round((option.votes / cast) * 100);
          return (
            <Card key={option.slot} tone="default" className="flex min-h-52 flex-col gap-4">
              <div className="flex items-center justify-between">
                <Badge tone="muted">{SLOT_LABEL[option.slot]}</Badge>
                <span className="font-mono text-sm tabular-nums text-neon">{percent}%</span>
              </div>
              <p className="text-2xl font-semibold leading-snug text-ink lg:text-3xl">
                {option.text}
              </p>
              <div className="mt-auto h-2 w-full overflow-hidden rounded-full bg-line/70">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-neon/70 to-neon transition-[width] duration-300"
                  style={{ width: `${percent}%` }}
                />
              </div>
            </Card>
          );
        })}
      </div>

      <Card className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-6">
          <Badge tone="neon">
            <Gavel className="size-3" />
            {cast} de {eligible} votos
          </Badge>
          <p className="flex items-center gap-2 font-mono text-xs uppercase tracking-[0.16em] text-muted">
            <Users className="size-3.5" />
            Los autores del duelo no votan
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={onSkip}>
          Cerrar votación
        </Button>
      </Card>
    </div>
  );
}
