import { useEffect, useMemo, useRef } from 'react';
import { useCountdown } from '../../hooks/useCountdown';
import { useHostEngine } from '../../hooks/useHostEngine';
import { useSoundEffects } from '../../hooks/useSoundEffects';
import { buildPlayerUrl } from '../../lib/roomCode';
import { activeMatchup } from '../../lib/realtime/view';
import { LobbyScreen } from './LobbyScreen';
import { MatchupVotingScreen } from './MatchupVotingScreen';
import { PodiumScreen } from './PodiumScreen';
import { PromptWritingScreen } from './PromptWritingScreen';
import { RevealScreen } from './RevealScreen';
import { RoundScoreScreen } from './RoundScoreScreen';
import { HostHeader } from './HostHeader';

export function HostContainer() {
  const { state, connection, error, actions } = useHostEngine();
  const { muted, play, toggleMuted } = useSoundEffects();
  const countdown = useCountdown(state.timer, null);
  const previousPhase = useRef(state.phase);

  const joinUrl = useMemo(() => {
    if (typeof window === 'undefined') return '';
    const configured = import.meta.env.PUBLIC_PLAY_ORIGIN?.trim() ?? '';
    const origin = configured.length > 0 ? configured : window.location.origin;
    return buildPlayerUrl(origin, state.roomCode);
  }, [state.roomCode]);

  useEffect(() => {
    if (previousPhase.current === state.phase) return;
    if (state.phase === 'PODIUM') play('victory');
    else if (state.phase === 'REVEAL') play('reveal');
    else play('whoosh');
    previousPhase.current = state.phase;
  }, [state.phase, play]);

  useEffect(() => {
    if (!countdown.urgent || countdown.seconds <= 0) return;
    play('tick');
  }, [countdown.urgent, countdown.seconds, play]);

  const matchup = activeMatchup(state);

  return (
    <div className="app-shell flex min-h-dvh flex-col">
      <HostHeader
        roomCode={state.roomCode}
        phase={state.phase}
        connection={connection}
        muted={muted}
        onToggleMuted={toggleMuted}
        onEnd={actions.end}
      />

      {error !== null && (
        <p className="border-b border-danger/40 bg-danger/10 px-4 py-3 text-center font-mono text-sm tracking-[0.08em] text-danger">
          {error}
        </p>
      )}

      <main className="cyber-grid flex flex-1 flex-col px-4 py-6 lg:px-10 lg:py-8">
        {state.phase === 'LOBBY' && (
          <LobbyScreen
            roomCode={state.roomCode}
            joinUrl={joinUrl}
            players={state.players}
            minPlayers={state.config.minPlayers}
            connection={connection}
            onStart={actions.start}
            onNewRoom={actions.newRoom}
          />
        )}

        {state.phase === 'WRITING' && (
          <PromptWritingScreen
            players={state.players}
            matchups={state.matchups}
            round={state.round}
            totalRounds={state.config.totalRounds}
            countdown={countdown}
            onSkip={actions.skip}
          />
        )}

        {state.phase === 'VOTING' && matchup !== null && (
          <MatchupVotingScreen
            matchup={matchup}
            players={state.players}
            index={state.matchupIndex + 1}
            total={state.matchups.length}
            countdown={countdown}
            onSkip={actions.skip}
          />
        )}

        {state.phase === 'REVEAL' && state.reveal !== null && (
          <RevealScreen reveal={state.reveal} countdown={countdown} onSkip={actions.skip} />
        )}

        {state.phase === 'LEADERBOARD' && (
          <RoundScoreScreen
            leaderboard={state.leaderboard}
            round={state.round}
            totalRounds={state.config.totalRounds}
            countdown={countdown}
            onSkip={actions.skip}
          />
        )}

        {state.phase === 'PODIUM' && state.podium !== null && (
          <PodiumScreen
            podium={state.podium}
            onRestart={actions.restart}
            onNewRoom={actions.newRoom}
          />
        )}
      </main>

      <footer className="border-t border-line/50 px-4 py-2 text-center font-mono text-[9px] uppercase tracking-[0.28em] text-muted/70">
        Host autoritativo · estado efímero en memoria · sin base de datos
      </footer>
    </div>
  );
}
