import { Crown, Medal, RefreshCw, RotateCcw, Sparkles, Trophy } from 'lucide-react';
import type { PodiumEntry, PodiumPayload } from '../../types/game';
import { Avatar } from '../ui/Avatar';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';

export interface PodiumScreenProps {
  podium: PodiumPayload;
  onRestart: () => void;
  onNewRoom: () => void;
}

const RANK_TONE = ['neon', 'magenta', 'amber'] as const;

function PodiumCard({ entry, champion }: { entry: PodiumEntry; champion: boolean }) {
  return (
    <Card
      tone={RANK_TONE[entry.rank - 1] ?? 'default'}
      className={champion ? 'animate-pulse-glow flex flex-col items-center gap-3 p-8 text-center' : 'flex flex-col items-center gap-2 p-5 text-center'}
    >
      <Badge tone={RANK_TONE[entry.rank - 1] ?? 'muted'}>
        {entry.rank === 1 ? <Crown className="size-3" /> : <Medal className="size-3" />}#{entry.rank}
      </Badge>
      <Avatar seed={entry.playerId} alias={entry.alias} size={champion ? 'lg' : 'md'} />
      <p className={champion ? 'text-3xl font-bold text-glow' : 'text-lg font-semibold'}>
        {entry.alias}
      </p>
      <p className="font-mono text-xs uppercase tracking-[0.18em] text-muted">{entry.title}</p>
      <p className="font-mono text-xl tabular-nums text-neon">{entry.score} pts</p>
    </Card>
  );
}

export function PodiumScreen({ podium, onRestart, onNewRoom }: PodiumScreenProps) {
  const [champion, ...rest] = podium.entries;

  return (
    <div className="space-y-6">
      <div className="text-center">
        <Badge tone="magenta">Partida finalizada</Badge>
        <h1 className="mt-3 flex items-center justify-center gap-3 font-display text-4xl font-bold uppercase tracking-[0.1em] lg:text-6xl">
          <Trophy className="size-10 text-amber" />
          Podio final
        </h1>
        <p className="mt-2 text-sm text-muted">
          El comité de celebraciones valida los resultados. Sin auditoría pendiente.
        </p>
      </div>

      <div className="mx-auto grid max-w-5xl gap-4 lg:grid-cols-[1.4fr_1fr_1fr] lg:items-end">
        {champion !== undefined && <PodiumCard entry={champion} champion />}
        {rest.map((entry) => (
          <PodiumCard key={entry.playerId} entry={entry} champion={false} />
        ))}
      </div>

      {podium.awards.length > 0 && (
        <Card className="mx-auto max-w-5xl space-y-3">
          <h2 className="flex items-center gap-2 font-display text-sm uppercase tracking-[0.18em]">
            <Sparkles className="size-4 text-amber" />
            Menciones honoríficas
          </h2>
          <div className="grid gap-2 sm:grid-cols-3">
            {podium.awards.map((award) => (
              <div key={award.label} className="rounded-xl border border-line/70 bg-panel/50 px-4 py-3">
                <p className="font-mono text-xs uppercase tracking-[0.18em] text-amber">
                  {award.label}
                </p>
                <p className="mt-1 text-sm font-semibold text-ink">{award.alias}</p>
                <p className="text-xs text-muted">{award.detail}</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button size="lg" onClick={onRestart}>
          <RotateCcw className="size-4" />
          Jugar otra vez
        </Button>
        <Button variant="secondary" size="sm" onClick={onNewRoom}>
          <RefreshCw className="size-3.5" />
          Nueva sala
        </Button>
      </div>
    </div>
  );
}
