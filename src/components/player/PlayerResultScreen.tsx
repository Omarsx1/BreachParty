import { Crown, Sparkles, Trophy, Zap } from 'lucide-react';
import type { Countdown } from '../../hooks/useCountdown';
import type { PlayerId, PlayerSync, PlayerView } from '../../types/game';
import { Badge } from '../ui/Badge';
import { Card } from '../ui/Card';
import { TimerBar } from '../ui/TimerBar';

export interface PlayerResultScreenProps {
  view: PlayerView;
  sync: PlayerSync | null;
  playerId: PlayerId;
  countdown: Countdown;
}

export function PlayerResultScreen({ view, sync, playerId, countdown }: PlayerResultScreenProps) {
  const myRank = view.leaderboard.find((entry) => entry.playerId === playerId);
  const myPodium = view.podium?.entries.find((entry) => entry.playerId === playerId);
  const score = sync?.score ?? myRank?.score ?? 0;

  if (view.phase === 'REVEAL' && view.reveal !== null) {
    const mine = view.reveal.options.find((option) => option.playerId === playerId);
    return (
      <div className="space-y-4">
        <TimerBar {...countdown} label="Siguiente duelo" />
        <Card tone="magenta" className="space-y-3 p-5">
          <p className="font-mono text-xs uppercase tracking-[0.22em] text-magenta">
            Revelación · Ronda {view.reveal.round}
          </p>
          <h1 className="font-display text-lg font-semibold leading-snug">{view.reveal.prompt}</h1>
          <div className="space-y-2 border-t border-line/60 pt-3">
            {view.reveal.options.map((option) => (
              <div
                key={option.slot}
                className={
                  option.playerId === playerId
                    ? 'rounded-xl border border-neon/50 bg-neon/5 px-3 py-2'
                    : 'rounded-xl border border-line/60 px-3 py-2'
                }
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold text-ink">
                    {option.playerId === playerId ? 'Tú' : option.alias}
                  </p>
                  <p className="font-mono text-xs text-muted">
                    {option.percent}% · {option.votes} {option.votes === 1 ? 'voto' : 'votos'}
                  </p>
                </div>
                <p className="mt-1 text-sm leading-snug text-muted">{option.text}</p>
              </div>
            ))}
          </div>
        </Card>

        {mine !== undefined && (
          <Card tone="neon" className="flex items-center justify-between gap-3 p-4">
            <Badge tone="amber">
              <Sparkles className="size-3" />+{mine.points} pts
            </Badge>
            {mine.ciberPlash && (
              <Badge tone="magenta">
                <Zap className="size-3" />
                Ciber-Plash +250
              </Badge>
            )}
          </Card>
        )}

        <Badge tone="muted">Puntaje parcial: {score} pts</Badge>
      </div>
    );
  }

  if (view.phase === 'PODIUM' && view.podium !== null) {
    return (
      <div className="space-y-4">
        <Card tone="neon" className="space-y-4 p-6 text-center">
          <Trophy className="mx-auto size-12 text-amber" />
          <h1 className="font-display text-2xl font-bold uppercase tracking-[0.08em]">
            Fin de la partida
          </h1>
          <p className="font-mono text-4xl font-bold tabular-nums text-neon">{score} pts</p>
          {myPodium !== undefined ? (
            <>
              <Badge tone="amber">
                <Crown className="size-3" />#{myPodium.rank} · {myPodium.title}
              </Badge>
              <p className="text-sm text-muted">Gracias por jugar. El comité no recibió quejas formales.</p>
            </>
          ) : (
            <p className="text-sm text-muted">
              {myRank !== undefined ? `Puesto #${myRank.rank} de ${view.leaderboard.length}.` : 'Partida cerrada.'}{' '}
              Siempre queda la próxima ronda de after office.
            </p>
          )}
        </Card>

        <Card className="space-y-2">
          {view.podium.entries.map((entry) => (
            <div key={entry.playerId} className="flex items-center justify-between gap-2 text-sm">
              <p className="truncate text-ink">
                #{entry.rank} {entry.alias}
              </p>
              <p className="font-mono text-xs text-muted">{entry.score} pts</p>
            </div>
          ))}
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <TimerBar {...countdown} label="Siguiente ronda" />
      <Card tone="neon" className="space-y-4 p-6 text-center">
        <h1 className="font-display text-xl font-bold uppercase tracking-[0.08em]">
          Tabla de posiciones
        </h1>
        <p className="font-mono text-3xl font-bold tabular-nums text-neon">{score} pts</p>
        {myRank !== undefined && (
          <Badge tone="neon">
            Puesto #{myRank.rank} de {view.leaderboard.length}
          </Badge>
        )}
        <div className="space-y-1 border-t border-line/60 pt-4 text-left">
          {view.leaderboard.slice(0, 5).map((entry) => (
            <p
              key={entry.playerId}
              className="flex items-center justify-between gap-2 font-mono text-xs text-muted"
            >
              <span className="truncate">
                #{entry.rank} {entry.alias}
              </span>
              <span className="text-ink">{entry.score} pts</span>
            </p>
          ))}
        </div>
      </Card>
    </div>
  );
}
