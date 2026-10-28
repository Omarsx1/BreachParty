import { useCallback, useEffect, useRef } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { collectPresence, createRoomChannel } from '../lib/realtime/channel';
import { isHostHelloPayload, isPlayerSync, isStateBroadcast } from '../lib/realtime/protocol';
import { MISSING_CONFIG_MESSAGE, getSupabaseClient, isSupabaseConfigured } from '../lib/supabase';
import { useGameStore } from '../stores/gameStore';
import { MAX_ALIAS_LENGTH, MAX_ANSWER_LENGTH, REALTIME_EVENTS } from '../types/game';
import type {
  ConnectionStatus,
  PlayerId,
  PlayerSync,
  PlayerView,
  RoomCode,
  VoteSlot,
} from '../types/game';

const SESSION_KEY = 'breachparty:player-session';
const HOST_TIMEOUT_MS = 12_000;
const WATCHDOG_MS = 2000;

interface StoredSession {
  roomCode: RoomCode;
  playerId: PlayerId;
  alias: string;
}

interface Identity {
  roomCode: RoomCode;
  playerId: PlayerId;
  alias: string;
}

function readSession(): StoredSession | null {
  if (typeof window === 'undefined') return null;
  const raw = window.sessionStorage.getItem(SESSION_KEY);
  if (raw === null) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return null;
    const record = parsed as Record<string, unknown>;
    if (
      typeof record.roomCode !== 'string' ||
      typeof record.playerId !== 'string' ||
      typeof record.alias !== 'string'
    ) {
      return null;
    }
    return { roomCode: record.roomCode, playerId: record.playerId, alias: record.alias };
  } catch {
    return null;
  }
}

function writeSession(session: StoredSession | null): void {
  if (typeof window === 'undefined') return;
  if (session === null) window.sessionStorage.removeItem(SESSION_KEY);
  else window.sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

function createPlayerId(): PlayerId {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `p-${Math.random().toString(36).slice(2, 10)}-${Date.now().toString(36)}`;
}

export interface PlayerClient {
  view: PlayerView | null;
  sync: PlayerSync | null;
  connection: ConnectionStatus;
  error: string | null;
  hostAlive: boolean;
  roomCode: RoomCode | null;
  playerId: PlayerId | null;
  alias: string | null;
  submittedMatchupIds: string[];
  votedMatchupIds: string[];
  join: (roomCode: RoomCode, alias: string) => void;
  leave: () => void;
  submitAnswer: (matchupId: string, text: string) => void;
  castVote: (matchupId: string, slot: VoteSlot) => void;
}

/**
 * Cliente reactivo del móvil. Nunca calcula puntajes ni transiciones: solo
 * escucha el estado del host y emite `SUBMIT_ANSWER` / `CAST_VOTE`.
 */
export function usePlayerClient(preferredRoomCode: RoomCode | null = null): PlayerClient {
  const view = useGameStore((state) => state.view);
  const sync = useGameStore((state) => state.sync);
  const connection = useGameStore((state) => state.connection);
  const error = useGameStore((state) => state.error);
  const hostAlive = useGameStore((state) => state.hostAlive);
  const roomCode = useGameStore((state) => state.roomCode);
  const playerId = useGameStore((state) => state.playerId);
  const alias = useGameStore((state) => state.alias);
  const submittedMatchupIds = useGameStore((state) => state.submittedMatchupIds);
  const votedMatchupIds = useGameStore((state) => state.votedMatchupIds);
  const setView = useGameStore((state) => state.setView);
  const setSync = useGameStore((state) => state.setSync);
  const setConnection = useGameStore((state) => state.setConnection);
  const setError = useGameStore((state) => state.setError);
  const setHostAlive = useGameStore((state) => state.setHostAlive);
  const setIdentity = useGameStore((state) => state.setIdentity);
  const markSubmitted = useGameStore((state) => state.markSubmitted);
  const markVoted = useGameStore((state) => state.markVoted);
  const reset = useGameStore((state) => state.reset);

  const channelRef = useRef<RealtimeChannel | null>(null);
  const identityRef = useRef<Identity | null>(null);
  const lastHostAt = useRef<number>(0);

  const teardown = useCallback(() => {
    const supabase = getSupabaseClient();
    const channel = channelRef.current;
    channelRef.current = null;
    if (supabase !== null && channel !== null) {
      void channel.untrack();
      void supabase.removeChannel(channel);
    }
  }, []);

  const connect = useCallback(
    (nextRoomCode: RoomCode, nextPlayerId: PlayerId, nextAlias: string) => {
      const supabase = getSupabaseClient();
      if (supabase === null) {
        setConnection('error');
        setError(MISSING_CONFIG_MESSAGE);
        return;
      }
      teardown();
      const channel = createRoomChannel(supabase, nextRoomCode, nextPlayerId);
      channelRef.current = channel;
      identityRef.current = { roomCode: nextRoomCode, playerId: nextPlayerId, alias: nextAlias };
      lastHostAt.current = 0;
      setView(null);
      setSync(null);
      setConnection('connecting');
      setError(null);

      channel
        .on('broadcast', { event: REALTIME_EVENTS.STATE }, (message: { payload: unknown }) => {
          if (!isStateBroadcast(message.payload)) return;
          setView(message.payload.view);
          lastHostAt.current = Date.now();
          setHostAlive(true);
        })
        .on('broadcast', { event: REALTIME_EVENTS.PLAYER_SYNC }, (message: { payload: unknown }) => {
          if (!isPlayerSync(message.payload)) return;
          if (message.payload.playerId !== nextPlayerId) return;
          setSync(message.payload);
          lastHostAt.current = Date.now();
          setHostAlive(true);
        })
        .on('broadcast', { event: REALTIME_EVENTS.HOST_HELLO }, (message: { payload: unknown }) => {
          if (!isHostHelloPayload(message.payload)) return;
          lastHostAt.current = Date.now();
          setHostAlive(true);
        })
        .on('presence', { event: 'sync' }, () => {
          const host = collectPresence(channel).some((meta) => meta.role === 'host');
          if (!host) return;
          lastHostAt.current = Date.now();
          setHostAlive(true);
        });

      channel.subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setConnection('live');
          void channel.track({
            playerId: nextPlayerId,
            alias: nextAlias,
            role: 'player',
            joinedAt: Date.now(),
          });
          void channel.send({
            type: 'broadcast',
            event: REALTIME_EVENTS.PLAYER_HELLO,
            payload: { playerId: nextPlayerId, alias: nextAlias },
          });
          return;
        }
        if (status === 'TIMED_OUT') setConnection('reconnecting');
        if (status === 'CHANNEL_ERROR') setConnection('error');
        if (status === 'CLOSED') setConnection('offline');
      });
    },
    [setConnection, setError, setHostAlive, setSync, setView, teardown],
  );

  const join = useCallback(
    (nextRoomCode: RoomCode, nextAlias: string) => {
      if (!isSupabaseConfigured) {
        setConnection('error');
        setError(MISSING_CONFIG_MESSAGE);
        return;
      }
      const cleanAlias = nextAlias.replace(/\s+/g, ' ').trim().slice(0, MAX_ALIAS_LENGTH);
      if (cleanAlias.length < 2) {
        setError('Tu alias necesita al menos 2 caracteres.');
        return;
      }
      const stored = readSession();
      const nextPlayerId =
        stored !== null && stored.roomCode === nextRoomCode ? stored.playerId : createPlayerId();
      writeSession({ roomCode: nextRoomCode, playerId: nextPlayerId, alias: cleanAlias });
      setIdentity({ roomCode: nextRoomCode, playerId: nextPlayerId, alias: cleanAlias });
      connect(nextRoomCode, nextPlayerId, cleanAlias);
    },
    [connect, setConnection, setError, setIdentity],
  );

  const leave = useCallback(() => {
    teardown();
    identityRef.current = null;
    writeSession(null);
    reset();
  }, [reset, teardown]);

  const submitAnswer = useCallback(
    (matchupId: string, text: string) => {
      const channel = channelRef.current;
      const identity = identityRef.current;
      if (channel === null || identity === null) return;
      const clean = text.replace(/\s+/g, ' ').trim().slice(0, MAX_ANSWER_LENGTH);
      if (clean.length === 0) return;
      void channel.send({
        type: 'broadcast',
        event: REALTIME_EVENTS.SUBMIT_ANSWER,
        payload: { playerId: identity.playerId, matchupId, text: clean },
      });
      markSubmitted(matchupId);
    },
    [markSubmitted],
  );

  const castVote = useCallback(
    (matchupId: string, slot: VoteSlot) => {
      const channel = channelRef.current;
      const identity = identityRef.current;
      if (channel === null || identity === null) return;
      void channel.send({
        type: 'broadcast',
        event: REALTIME_EVENTS.CAST_VOTE,
        payload: { playerId: identity.playerId, matchupId, slot },
      });
      markVoted(matchupId);
    },
    [markVoted],
  );

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setConnection('error');
      setError(MISSING_CONFIG_MESSAGE);
      return;
    }
    const stored = readSession();
    if (stored === null) return;
    if (preferredRoomCode !== null && preferredRoomCode !== stored.roomCode) return;
    setIdentity({
      roomCode: stored.roomCode,
      playerId: stored.playerId,
      alias: stored.alias,
    });
    connect(stored.roomCode, stored.playerId, stored.alias);
  }, [connect, preferredRoomCode, setConnection, setError, setIdentity]);

  useEffect(() => {
    const id = window.setInterval(() => {
      if (identityRef.current === null) return;
      const seenAt = lastHostAt.current;
      setHostAlive(seenAt > 0 && Date.now() - seenAt < HOST_TIMEOUT_MS);
    }, WATCHDOG_MS);
    return () => window.clearInterval(id);
  }, [setHostAlive]);

  useEffect(() => teardown, [teardown]);

  return {
    view,
    sync,
    connection,
    error,
    hostAlive,
    roomCode,
    playerId,
    alias,
    submittedMatchupIds,
    votedMatchupIds,
    join,
    leave,
    submitAnswer,
    castVote,
  };
}
