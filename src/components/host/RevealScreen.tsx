import { Crown, Gavel, Sparkles, Zap } from 'lucide-react';
import type { Countdown } from '../../hooks/useCountdown';
import type { RevealOptionView, RevealView } from '../../types/game';
import { Avatar } from '../ui/Avatar';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { TimerBar } from '../ui/TimerBar';

export interface RevealScreenProps {
  reveal: RevealView;
  countdown: Countdown;
  onSkip: () => void;
}

export function RevealScreen({ reveal, countdown, onSkip }: RevealScreenProps) {
  const [first, second] = reveal.options;
  const winnerSlot =
    first.votes === second.votes ? null : first.votes > second.votes ? first.slot : second.slot;

  const renderOption = (option: RevealOptionView) => {
    const winner = winnerSlot === option.slot;
    return (
      <Card
        key={option.slot}
        tone={winner ? 'neon' : 'default'}
        className="animate-rise flex min-h-56 flex-col gap-4"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Avatar seed={option.alias} alias={option.alias} size="md" />
            <div>
              <p className="text-sm font-semibold text-ink">{option.alias}</p>
              <p className="font-mono text-xs uppercase tracking-[0.18em] text-muted">
                Respuesta {option.slot}
              </p>
            </div>
          </div>
          {winner && (
            <Badge tone="neon">
              <Crown className="size-3" />
              Ganador
            </Badge>
          )}
        </div>

        <p className="text-xl font-semibold leading-snug text-ink lg:text-2xl">{option.text}</p>

        <div className="mt-auto space-y-3">
          <div className="h-2 w-full overflow-hidden rounded-full bg-line/70">
            <div
              className={winner ? 'h-full rounded-full bg-neon' : 'h-full rounded-full bg-muted/60'}
              style={{ width: `${option.percent}%` }}
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={winner ? 'neon' : 'muted'}>
              <Gavel className="size-3" />
              {option.votes} {option.votes === 1 ? 'voto' : 'votos'} · {option.percent}%
            </Badge>
            <Badge tone="amber">
              <Sparkles className="size-3" />+{option.points} pts
            </Badge>
            {option.ciberPlash && (
              <Badge tone="magenta" className="animate-pop">
                <Zap className="size-3" />
                Ciber-Plash +250
              </Badge>
            )}
          </div>
        </div>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div className="max-w-3xl">
          <Badge tone="amber">Revelación · Ronda {reveal.round}</Badge>
          <h1 className="mt-3 font-display text-3xl font-semibold leading-snug lg:text-4xl">
            {reveal.prompt}
          </h1>
        </div>
        <div className="w-full max-w-xs">
          <TimerBar {...countdown} label="Siguiente duelo" />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {renderOption(first)}
        {renderOption(second)}
      </div>

      <Card className="flex flex-wrap items-center justify-between gap-4">
        <Badge tone="muted">
          {reveal.totalVotes} {reveal.totalVotes === 1 ? 'voto total' : 'votos totales'}
        </Badge>
        <Button variant="secondary" size="sm" onClick={onSkip}>
          Continuar
        </Button>
      </Card>
    </div>
  );
}
