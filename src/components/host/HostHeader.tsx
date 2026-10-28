import { Radio, ShieldCheck, Volume2, VolumeX, Wifi, WifiOff } from 'lucide-react';
import type { ConnectionStatus, GamePhase, RoomCode } from '../../types/game';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';

const PHASE_LABEL: Record<GamePhase, string> = {
  LOBBY: 'Sala de espera',
  WRITING: 'Escritura',
  VOTING: 'Votación',
  REVEAL: 'Revelación',
  LEADERBOARD: 'Posiciones',
  PODIUM: 'Podio',
};

export interface HostHeaderProps {
  roomCode: RoomCode;
  phase: GamePhase;
  connection: ConnectionStatus;
  muted: boolean;
  onToggleMuted: () => void;
}

export function HostHeader({
  roomCode,
  phase,
  connection,
  muted,
  onToggleMuted,
}: HostHeaderProps) {
  const live = connection === 'live';

  return (
    <header className="flex flex-wrap items-center justify-between gap-4 border-b border-line/70 bg-void/60 px-4 py-3 backdrop-blur lg:px-10">
      <div className="flex items-center gap-3">
        <span className="flex size-10 items-center justify-center rounded-xl border border-neon/40 bg-neon/10">
          <ShieldCheck className="size-5 text-neon" />
        </span>
        <div>
          <p className="font-display text-sm font-bold uppercase tracking-[0.28em] text-ink">
            BreachParty
          </p>
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted">
            InfoSec After Office
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Badge tone="neon">
          <Radio className="size-3" />
          Sala {roomCode}
        </Badge>
        <Badge tone="muted">{PHASE_LABEL[phase]}</Badge>
        <Badge tone={live ? 'neon' : 'danger'}>
          {live ? <Wifi className="size-3" /> : <WifiOff className="size-3" />}
          {live ? 'Realtime' : 'Sin enlace'}
        </Badge>
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleMuted}
          aria-label={muted ? 'Activar sonido' : 'Silenciar'}
        >
          {muted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
          {muted ? 'Mudo' : 'Audio'}
        </Button>
      </div>
    </header>
  );
}
