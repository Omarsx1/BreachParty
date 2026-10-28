import { useState } from 'react';
import { Copy, Play, RefreshCw, Users } from 'lucide-react';
import type { ConnectionStatus, Player, RoomCode } from '../../types/game';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { QrCode } from '../ui/QrCode';
import { PlayerRoster } from './PlayerRoster';

export interface LobbyScreenProps {
  roomCode: RoomCode;
  joinUrl: string;
  players: Player[];
  minPlayers: number;
  connection: ConnectionStatus;
  onStart: () => void;
  onNewRoom: () => void;
}

export function LobbyScreen({
  roomCode,
  joinUrl,
  players,
  minPlayers,
  connection,
  onStart,
  onNewRoom,
}: LobbyScreenProps) {
  const [copied, setCopied] = useState(false);
  const online = players.filter((player) => player.connected).length;
  const canStart = online >= minPlayers;
  const live = connection === 'live';

  const copyLink = async () => {
    try {
      await navigator.clipboard?.writeText(joinUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="grid flex-1 gap-6 xl:grid-cols-[1.05fr_1fr]">
      <Card tone="neon" className="flex flex-col gap-6 p-8">
        <div className="flex items-center justify-between gap-3">
          <Badge tone="neon">Sala activa</Badge>
          <Badge tone={live ? 'neon' : 'danger'}>
            {live ? 'Host en línea' : connection === 'reconnecting' ? 'Reconectando' : 'Sin enlace'}
          </Badge>
        </div>

        <div>
          <p className="font-mono text-xs uppercase tracking-[0.3em] text-muted">
            Código de sala
          </p>
          <p className="room-code mt-2 text-6xl font-bold text-neon text-glow lg:text-7xl">
            {roomCode}
          </p>        </div>

        <div className="flex flex-wrap items-center gap-5">
          <QrCode value={joinUrl} size={168} />
          <div className="min-w-0 space-y-3">
            <p className="font-mono text-xs uppercase tracking-[0.22em] text-muted">
              Escanea o entra a
            </p>
            <p className="break-all font-mono text-xs text-ink">{joinUrl}</p>
            <Button variant="secondary" size="sm" onClick={() => void copyLink()}>
              <Copy className="size-3.5" />
              {copied ? 'Copiado' : 'Copiar enlace'}
            </Button>
          </div>
        </div>

        <div className="mt-auto flex flex-wrap items-center gap-3 border-t border-line/60 pt-5">
          <Button size="lg" onClick={onStart} disabled={!canStart}>
            <Play className="size-4" />
            Iniciar partida
          </Button>
          <Button variant="ghost" size="sm" onClick={onNewRoom}>
            <RefreshCw className="size-3.5" />
            Nuevo código
          </Button>
          <span className="font-mono text-xs uppercase tracking-[0.18em] text-muted">
            {canStart ? `${online} listos` : `Faltan ${minPlayers - online} jugadores`}
          </span>
        </div>
      </Card>

      <Card className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-bold uppercase tracking-[0.16em]">
            Jugadores
          </h2>
          <Badge tone="muted">
            <Users className="size-3" />
            {online}
          </Badge>
        </div>
        <PlayerRoster players={players} columns="grid-cols-2" emptyLabel="Comparte el código o el QR" />
        <p className="mt-auto font-mono text-xs uppercase leading-relaxed tracking-[0.16em] text-muted">
          Mínimo {minPlayers} jugadores · 2 rondas · 60s de escritura y 20s por duelo
        </p>
      </Card>
    </div>
  );
}
