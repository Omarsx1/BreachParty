import { useState } from 'react';
import type { SyntheticEvent } from 'react';
import { KeyRound, LogIn, UserRound } from 'lucide-react';
import { isValidRoomCode, normalizeRoomCode } from '../../lib/roomCode';
import type { RoomCode } from '../../types/game';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Input } from '../ui/Input';

export interface JoinRoomFormProps {
  initialCode: RoomCode | null;
  busy: boolean;
  error: string | null;
  onJoin: (code: RoomCode, alias: string) => void;
}

export function JoinRoomForm({ initialCode, busy, error, onJoin }: JoinRoomFormProps) {
  const [code, setCode] = useState<RoomCode>(initialCode ?? '');
  const [alias, setAlias] = useState('');
  const [touched, setTouched] = useState(false);

  const codeValid = isValidRoomCode(code);
  const aliasValid = alias.trim().length >= 2;

  const submit = (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    setTouched(true);
    if (!codeValid || !aliasValid) return;
    onJoin(code, alias);
  };

  return (
    <Card tone="neon" className="animate-rise space-y-6 p-6">
      <div className="space-y-2">
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-neon">Acceso a sala</p>
        <h1 className="font-display text-2xl font-bold uppercase tracking-[0.08em]">
          Entra a la fiesta
        </h1>
        <p className="text-sm text-muted">
          Pide el código de 4 letras al host proyectado en Teams.
        </p>
      </div>

      <form className="space-y-4" onSubmit={submit}>
        <Input
          label="Código de sala"
          value={code}
          onChange={(event) => setCode(normalizeRoomCode(event.target.value))}
          placeholder="ABCD"
          autoCapitalize="characters"
          autoComplete="off"
          maxLength={4}
          leading={<KeyRound className="size-4" />}
          className="room-code text-center text-2xl font-bold"
          error={touched && !codeValid ? 'El código son 4 letras' : undefined}
        />
        <Input
          label="Tu alias"
          value={alias}
          onChange={(event) => setAlias(event.target.value)}
          placeholder="firewall_humano"
          maxLength={16}
          leading={<UserRound className="size-4" />}
          hint="Así te verán en el podio. Sin datos reales, por favor."
          error={touched && !aliasValid ? 'Mínimo 2 caracteres' : undefined}
        />

        {error !== null && (
          <p className="rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-xs text-danger">
            {error}
          </p>
        )}

        <Button type="submit" size="lg" fullWidth disabled={busy}>
          <LogIn className="size-4" />
          {busy ? 'Conectando…' : 'Unirme'}
        </Button>
      </form>
    </Card>
  );
}
