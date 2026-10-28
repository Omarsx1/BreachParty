import { Clock3, Radar, ShieldCheck, Users, WifiOff } from 'lucide-react';
import type { ConnectionStatus, PlayerSync, PlayerView } from '../../types/game';
import { Avatar } from '../ui/Avatar';
import { Badge } from '../ui/Badge';
import { Card } from '../ui/Card';

export interface WaitingScreenProps {
  view: PlayerView | null;
  sync: PlayerSync | null;
  connection: ConnectionStatus;
  hostAlive: boolean;
  roomCode: string | null;
}

export function WaitingScreen({
  view,
  sync,
  connection,
  hostAlive,
  roomCode,
}: WaitingScreenProps) {
  if (view === null) {
    const message =
      connection === 'error'
        ? 'No pudimos abrir el canal en tiempo real. Revisa la configuración de Supabase.'
        : hostAlive
          ? 'Enlace establecido. Esperando el estado de la partida…'
          : 'Abre /host en la pantalla compartida con este código de sala.';
    return (
      <Card tone={hostAlive ? 'neon' : 'amber'} className="animate-rise space-y-4 p-6 text-center">
        <Radar className="mx-auto size-10 animate-float text-neon" />
        <h1 className="font-display text-xl font-bold uppercase tracking-[0.1em]">
          Buscando al host
        </h1>
        <p className="text-base text-muted">{message}</p>
        <Badge tone={hostAlive ? 'neon' : 'amber'}>
          {hostAlive ? <ShieldCheck className="size-3" /> : <WifiOff className="size-3" />}
          Sala {roomCode ?? '—'}
        </Badge>
      </Card>
    );
  }

  const online = view.players.filter((player) => player.connected).length;
  const admitted = sync?.admitted ?? true;

  if (!admitted) {
    return (
      <Card tone="amber" className="animate-rise space-y-3 p-6 text-center">
        <Clock3 className="mx-auto size-10 text-amber" />
        <h1 className="font-display text-xl font-bold uppercase tracking-[0.1em]">
          Entras en la próxima ronda
        </h1>
        <p className="text-base text-muted">
          La partida ya está en curso. Tu alias quedó registrado como{' '}
          <span className="text-ink">{sync?.alias ?? 'jugador'}</span>.
        </p>
      </Card>
    );
  }

  const lobby = view.phase === 'LOBBY';

  return (
    <Card tone="neon" className="animate-rise space-y-5 p-6 text-center">
      <div className="space-y-1">
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-neon">
          {lobby ? 'Sala de espera' : 'Esperando'}
        </p>
        <h1 className="font-display text-2xl font-bold uppercase tracking-[0.08em]">
          {sync?.alias ?? 'Jugador'}
        </h1>
        <p className="text-base text-muted">
          {lobby
            ? 'El host inicia cuando estén todos listos.'
            : 'El siguiente duelo aparece en tu pantalla automáticamente.'}
        </p>
      </div>

      <div className="flex items-center justify-center gap-3">
        <Badge tone="neon">
          <Users className="size-3" />
          {online} conectados
        </Badge>
        <Badge tone="amber">{sync?.score ?? 0} pts</Badge>
      </div>

      <div className="flex flex-wrap justify-center gap-2">
        {view.players.slice(0, 10).map((player) => (
          <Avatar key={player.id} seed={player.id} alias={player.alias} size="sm" />
        ))}
      </div>
    </Card>
  );
}
