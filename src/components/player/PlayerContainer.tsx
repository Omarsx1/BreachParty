import { useMemo, useState } from 'react';
import { useCountdown } from '../../hooks/useCountdown';
import { usePlayerClient } from '../../hooks/usePlayerClient';
import { readRoomCodeFromSearch } from '../../lib/roomCode';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { PlayerHeader } from './PlayerHeader';
import { PlayerPhaseView } from './PlayerPhaseView';

const IDLE_TIMER = { endsAt: null, durationMs: null };

export function PlayerContainer() {
  const initialCode = useMemo(
    () => (typeof window === 'undefined' ? null : readRoomCodeFromSearch(window.location.search)),
    [],
  );
  const client = usePlayerClient(initialCode);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const countdown = useCountdown(
    client.view?.timer ?? IDLE_TIMER,
    client.view?.sentAt ?? null,
  );

  return (
    <div className="app-shell scanlines min-h-dvh">
      <PlayerHeader
        alias={client.alias}
        roomCode={client.roomCode}
        score={client.sync?.score ?? 0}
        showScore={client.view !== null}
        canLeave={client.playerId !== null}
        onLeave={() => setConfirmLeave(true)}
      />

      <main className="mx-auto w-full max-w-md px-4 py-5">
        <PlayerPhaseView client={client} countdown={countdown} initialCode={initialCode} />
      </main>

      <Modal
        open={confirmLeave}
        title="Salir de la sala"
        onClose={() => setConfirmLeave(false)}
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setConfirmLeave(false)}>
              Quedarme
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={() => {
                setConfirmLeave(false);
                client.leave();
              }}
            >
              Salir
            </Button>
          </>
        }
      >
        <p>
          Vas a desconectarte de BreachParty. Tus puntos de esta partida se quedan en la sala y no
          hay forma de recuperarlos.
        </p>
      </Modal>
    </div>
  );
}
