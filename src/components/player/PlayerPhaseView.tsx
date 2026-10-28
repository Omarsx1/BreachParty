import type { Countdown } from '../../hooks/useCountdown';
import type { PlayerClient } from '../../hooks/usePlayerClient';
import type { RoomCode } from '../../types/game';
import { AnswerInputScreen } from './AnswerInputScreen';
import { JoinRoomForm } from './JoinRoomForm';
import { PlayerResultScreen } from './PlayerResultScreen';
import { VoteButtonsScreen } from './VoteButtonsScreen';
import { WaitingScreen } from './WaitingScreen';

export interface PlayerPhaseViewProps {
  client: PlayerClient;
  countdown: Countdown;
  initialCode: RoomCode | null;
}

/** Router de pantallas del móvil: nunca calcula reglas, solo presenta estado. */
export function PlayerPhaseView({ client, countdown, initialCode }: PlayerPhaseViewProps) {
  if (client.playerId === null) {
    return (
      <JoinRoomForm
        initialCode={initialCode}
        busy={client.connection === 'connecting'}
        error={client.error}
        onJoin={client.join}
      />
    );
  }

  const view = client.view;
  const sync = client.sync;

  if (view === null || sync === null || !sync.admitted) {
    return (
      <WaitingScreen
        view={view}
        sync={sync}
        connection={client.connection}
        hostAlive={client.hostAlive}
        roomCode={client.roomCode}
      />
    );
  }

  switch (view.phase) {
    case 'WRITING':
      return (
        <AnswerInputScreen
          sync={sync}
          submittedMatchupIds={client.submittedMatchupIds}
          countdown={countdown}
          onSubmit={client.submitAnswer}
        />
      );
    case 'VOTING': {
      const matchup = view.matchup;
      if (matchup === null) break;
      const isAuthor = sync.prompts.some((prompt) => prompt.matchupId === matchup.id);
      return (
        <VoteButtonsScreen
          matchup={matchup}
          countdown={countdown}
          hasVoted={client.votedMatchupIds.includes(matchup.id)}
          isAuthor={isAuthor}
          onVote={(slot) => client.castVote(matchup.id, slot)}
        />
      );
    }
    case 'REVEAL':
    case 'LEADERBOARD':
    case 'PODIUM':
      return (
        <PlayerResultScreen
          view={view}
          sync={sync}
          playerId={client.playerId}
          countdown={countdown}
        />
      );
    default:
      break;
  }

  return (
    <WaitingScreen
      view={view}
      sync={sync}
      connection={client.connection}
      hostAlive={client.hostAlive}
      roomCode={client.roomCode}
    />
  );
}
