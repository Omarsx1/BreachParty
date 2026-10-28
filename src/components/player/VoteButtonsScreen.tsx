import { CheckCircle2, Eye, Gavel, Vote } from 'lucide-react';
import type { Countdown } from '../../hooks/useCountdown';
import type { MatchupView, VoteSlot } from '../../types/game';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { TimerBar } from '../ui/TimerBar';

export interface VoteButtonsScreenProps {
  matchup: MatchupView;
  countdown: Countdown;
  hasVoted: boolean;
  isAuthor: boolean;
  onVote: (slot: VoteSlot) => void;
}

export function VoteButtonsScreen({
  matchup,
  countdown,
  hasVoted,
  isAuthor,
  onVote,
}: VoteButtonsScreenProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Badge tone="magenta">
          Duelo {matchup.index} de {matchup.total}
        </Badge>
        <Badge tone="muted">
          {matchup.votesCast}/{matchup.eligibleVoters} votos
        </Badge>
      </div>

      <TimerBar {...countdown} label="Vota ahora" />

      <Card tone="default" className="space-y-2 p-5">
        <p className="font-mono text-xs uppercase tracking-[0.22em] text-muted">El prompt</p>
        <h1 className="font-display text-lg font-semibold leading-snug text-ink">
          {matchup.prompt}
        </h1>
      </Card>

      {isAuthor ? (
        <Card tone="amber" className="space-y-3 p-6 text-center">
          <Eye className="mx-auto size-10 text-amber" />
          <h2 className="font-display text-lg font-bold uppercase tracking-[0.08em]">
            Este duelo es tuyo
          </h2>
          <p className="text-sm text-muted">
            Mira la pantalla compartida. Tu respuesta ya está en juego y no puedes votar en ella.
          </p>
        </Card>
      ) : hasVoted ? (
        <Card tone="neon" className="space-y-3 p-6 text-center">
          <CheckCircle2 className="mx-auto size-10 text-neon" />
          <h2 className="font-display text-lg font-bold uppercase tracking-[0.08em]">
            Voto registrado
          </h2>
          <p className="text-sm text-muted">
            Espera la revelación en la pantalla del host. Sin cambiar el voto, sin arrepentimientos.
          </p>
          <Badge tone="muted">
            <Gavel className="size-3" />
            {matchup.votesCast} de {matchup.eligibleVoters}
          </Badge>
        </Card>
      ) : (
        <div className="space-y-3">
          {matchup.options.map((option) => (
            <Button
              key={option.slot}
              variant="vote"
              size="xl"
              fullWidth
              className="min-h-32 justify-start whitespace-normal px-5 py-5 text-left normal-case tracking-normal"
              onClick={() => onVote(option.slot)}
            >
              <span className="flex w-full flex-col gap-3">
                <span className="flex items-center gap-2 font-mono text-xs uppercase tracking-[0.2em] text-muted">
                  <Vote className="size-3.5" />
                  Respuesta {option.slot}
                </span>
                <span className="text-lg font-semibold leading-snug text-ink">{option.text}</span>
              </span>
            </Button>
          ))}
          <p className="text-center font-mono text-xs uppercase tracking-[0.16em] text-muted">
            Un voto por duelo. Elige la más graciosa, no la más correcta.
          </p>
        </div>
      )}
    </div>
  );
}
