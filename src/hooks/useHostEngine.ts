import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { FALLBACK_ANSWERS, PROMPT_BANK } from '../data/infosecPrompts';
import { HOST_PRESENCE_KEY, collectPresence, createRoomChannel } from '../lib/realtime/channel';
import { hasAnswered, hasVoted, isAuthor, voteCountsFor } from '../lib/realtime/matchupUtils';
import { isCastVotePayload, isPlayerHelloPayload, isSubmitAnswerPayload } from '../lib/realtime/protocol';
import {
  activeMatchup,
  buildLeaderboard,
  buildPodium,
  buildRevealView,
  eligibleVoterIds,
  toPlayerSync,
  toPlayerView,
} from '../lib/realtime/view';
import { generateRoomCode } from '../lib/roomCode';
import { MISSING_CONFIG_MESSAGE, getSupabaseClient, isSupabaseConfigured } from '../lib/supabase';
import {
  DEFAULT_GAME_CONFIG,
  MAX_ALIAS_LENGTH,
  MAX_ANSWER_LENGTH,
  REALTIME_EVENTS,
} from '../types/game';
import type {
  AssignedPrompt,
  ConnectionStatus,
  GameConfig,
  GamePrompt,
  HostAction,
  HostState,
  Matchup,
  MatchupResult,
  MatchupScore,
  Player,
  PlayerAssignment,
  PlayerId,
  PresenceMeta,
  RoomCode,
  StateBroadcast,
  VoteSlot,
} from '../types/game';

const TICK_MS = 200;
const HEARTBEAT_MS = 4000;

export type RandomSource = () => number;

const IDLE_TIMER = { endsAt: null, durationMs: null } as const;

/* ------------------------------------------------------------------ */
/* Utilidades puras (probadas en useHostEngine.test.ts)                */
/* ------------------------------------------------------------------ */

export function shuffle<T>(items: readonly T[], random: RandomSource): T[] {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1));
    const current = copy[index];
    copy[index] = copy[swap];
    copy[swap] = current;
  }
  return copy;
}

function pickPrompts(
  count: number,
  usedIds: string[],
  random: RandomSource,
): { prompts: GamePrompt[]; usedIds: string[] } {
  const unused = PROMPT_BANK.filter((prompt) => !usedIds.includes(prompt.id));
  let pool = unused.length > 0 ? unused : PROMPT_BANK;
  const picked: GamePrompt[] = [];
  while (picked.length < count && pool.length > 0) {
    for (const prompt of shuffle(pool, random)) {
      if (picked.length >= count) break;
      picked.push(prompt);
    }
    pool = PROMPT_BANK;
  }
  const pickedIds = picked.map((prompt) => prompt.id);
  const reused = pickedIds.some((id) => usedIds.includes(id));
  return {
    prompts: picked,
    usedIds: reused ? pickedIds : [...usedIds, ...pickedIds],
  };
}

/**
 * Emparejamiento en anillo: el prompt `i` lo responden los jugadores `i` e
 * `i + 1`. Cada jugador responde exactamente 2 prompts y cada duelo es 1v1.
 */
export function buildMatchups(
  players: Player[],
  prompts: GamePrompt[],
  random: RandomSource,
  round = 1,
): Matchup[] {
  if (players.length < 2) return [];
  const matchups: Matchup[] = [];
  for (let index = 0; index < players.length; index += 1) {
    const first = players[index];
    const second = players[(index + 1) % players.length];
    const prompt = prompts[index] ?? prompts[0];
    if (first === undefined || second === undefined || prompt === undefined) continue;
    const order: [PlayerId, PlayerId] =
      random() < 0.5 ? [first.id, second.id] : [second.id, first.id];
    matchups.push({
      id: `r${round}m${index + 1}`,
      promptId: prompt.id,
      prompt: prompt.text,
      category: prompt.category,
      authorIds: [first.id, second.id],
      order,
      answers: [],
      autoFilled: [],
      votes: [],
      result: null,
    });
  }
  return matchups;
}

export function buildAssignments(
  players: Player[],
  matchups: Matchup[],
): PlayerAssignment[] {
  const byPlayer = new Map<PlayerId, AssignedPrompt[]>();
  for (const matchup of matchups) {
    for (const authorId of matchup.authorIds) {
      const list = byPlayer.get(authorId) ?? [];
      list.push({
        matchupId: matchup.id,
        promptId: matchup.promptId,
        prompt: matchup.prompt,
        category: matchup.category,
      });
      byPlayer.set(authorId, list);
    }
  }
  return players.map((player) => ({
    playerId: player.id,
    prompts: byPlayer.get(player.id) ?? [],
  }));
}

export function computeMatchupResult(matchup: Matchup): MatchupResult {
  const counts = voteCountsFor(matchup);
  const totalVotes = counts.A + counts.B;
  const scoreFor = (slot: VoteSlot, playerId: PlayerId): MatchupScore => {
    const votes = slot === 'A' ? counts.A : counts.B;
    const ciberPlash = totalVotes > 0 && votes === totalVotes;
    return {
      playerId,
      slot,
      votes,
      percent: totalVotes === 0 ? 0 : Math.round((votes / totalVotes) * 100),
      points: votes * 100 + (ciberPlash ? 250 : 0),
      ciberPlash,
    };
  };
  return {
    totalVotes,
    scores: [scoreFor('A', matchup.order[0]), scoreFor('B', matchup.order[1])],
  };
}

export function createHostState(
  roomCode: RoomCode,
  config: GameConfig = DEFAULT_GAME_CONFIG,
): HostState {
  return {
    rev: 0,
    roomCode,
    phase: 'LOBBY',
    round: 0,
    config,
    players: [],
    assignments: [],
    matchups: [],
    matchupIndex: 0,
    usedPromptIds: [],
    reveal: null,
    leaderboard: [],
    podium: null,
    timer: { ...IDLE_TIMER },
    startedAt: null,
  };
}

/* ------------------------------------------------------------------ */
/* Transiciones de fase                                               */
/* ------------------------------------------------------------------ */

function sanitizeAlias(raw: string): string {
  const cleaned = raw.replace(/\s+/g, ' ').trim().slice(0, MAX_ALIAS_LENGTH);
  return cleaned.length > 0 ? cleaned : 'Anónimo';
}

function uniqueAlias(base: string, players: Player[]): string {
  const taken = new Set(players.map((player) => player.alias.toLowerCase()));
  if (!taken.has(base.toLowerCase())) return base;
  for (let suffix = 2; suffix < 100; suffix += 1) {
    const label = String(suffix);
    const candidate = `${base.slice(0, Math.max(1, MAX_ALIAS_LENGTH - label.length - 1))} ${label}`;
    if (!taken.has(candidate.toLowerCase())) return candidate;
  }
  return base;
}

function mergePresence(players: Player[], incoming: PresenceMeta[], now: number): Player[] {
  const onlineIds = new Set(incoming.map((meta) => meta.playerId));
  const merged = players.map((player) =>
    player.connected === onlineIds.has(player.id)
      ? player
      : { ...player, connected: onlineIds.has(player.id) },
  );
  for (const meta of incoming) {
    if (merged.some((player) => player.id === meta.playerId)) continue;
    merged.push({
      id: meta.playerId,
      alias: uniqueAlias(sanitizeAlias(meta.alias), merged),
      score: 0,
      connected: true,
      joinedAt: meta.joinedAt > 0 ? meta.joinedAt : now,
      answersSubmitted: 0,
      votesReceived: 0,
      ciberPlashes: 0,
    });
  }
  return merged;
}

function sameRoster(current: Player[], next: Player[]): boolean {
  if (current.length !== next.length) return false;
  return current.every((player, index) => {
    const other = next[index];
    return (
      other !== undefined &&
      player.id === other.id &&
      player.connected === other.connected &&
      player.alias === other.alias
    );
  });
}

function pickFallback(random: RandomSource): string {
  return FALLBACK_ANSWERS[Math.floor(random() * FALLBACK_ANSWERS.length)] ?? 'Sin respuesta.';
}

function answersComplete(matchups: Matchup[]): boolean {
  return matchups.length > 0 && matchups.every((matchup) => matchup.answers.length >= 2);
}

function applyScores(players: Player[], result: MatchupResult): Player[] {
  return players.map((player) => {
    const score = result.scores.find((entry) => entry.playerId === player.id);
    if (score === undefined) return player;
    return {
      ...player,
      score: player.score + score.points,
      votesReceived: player.votesReceived + score.votes,
      ciberPlashes: player.ciberPlashes + (score.ciberPlash ? 1 : 0),
    };
  });
}

function beginRound(state: HostState, now: number, random: RandomSource): HostState {
  const participants = state.players.filter((player) => player.connected);
  if (participants.length < state.config.minPlayers) {
    return {
      ...state,
      rev: state.rev + 1,
      phase: 'LOBBY',
      matchups: [],
      assignments: [],
      matchupIndex: 0,
      reveal: null,
      timer: { ...IDLE_TIMER },
    };
  }
  const { prompts, usedIds } = pickPrompts(participants.length, state.usedPromptIds, random);
  const matchups = buildMatchups(participants, prompts, random, state.round + 1);
  return {
    ...state,
    rev: state.rev + 1,
    phase: 'WRITING',
    round: state.round + 1,
    matchups,
    assignments: buildAssignments(participants, matchups),
    matchupIndex: 0,
    usedPromptIds: usedIds,
    reveal: null,
    startedAt: state.startedAt ?? now,
    timer: { endsAt: now + state.config.writingMs, durationMs: state.config.writingMs },
  };
}

function finishWriting(state: HostState, now: number, random: RandomSource): HostState {
  if (state.matchups.length === 0) {
    return {
      ...state,
      rev: state.rev + 1,
      phase: 'PODIUM',
      podium: buildPodium(state.players),
      timer: { ...IDLE_TIMER },
    };
  }
  const matchups = state.matchups.map((matchup) => {
    const missing = matchup.authorIds.filter(
      (authorId) => !matchup.answers.some((answer) => answer.playerId === authorId),
    );
    if (missing.length === 0) return matchup;
    return {
      ...matchup,
      answers: [
        ...matchup.answers,
        ...missing.map((authorId) => ({
          playerId: authorId,
          text: pickFallback(random),
          auto: true,
        })),
      ],
      autoFilled: [...matchup.autoFilled, ...missing],
    };
  });
  return {
    ...state,
    rev: state.rev + 1,
    phase: 'VOTING',
    matchups,
    matchupIndex: 0,
    reveal: null,
    timer: { endsAt: now + state.config.votingMs, durationMs: state.config.votingMs },
  };
}

function finishVoting(state: HostState, now: number): HostState {
  const matchup = activeMatchup(state);
  if (matchup === null) return state;
  const result = computeMatchupResult(matchup);
  const players = applyScores(state.players, result);
  const scored: Matchup = { ...matchup, result };
  const matchups = state.matchups.map((entry, index) =>
    index === state.matchupIndex ? scored : entry,
  );
  return {
    ...state,
    rev: state.rev + 1,
    phase: 'REVEAL',
    players,
    matchups,
    reveal: buildRevealView(scored, players, state.round),
    timer: { endsAt: now + state.config.revealMs, durationMs: state.config.revealMs },
  };
}

function finishReveal(state: HostState, now: number): HostState {
  const nextIndex = state.matchupIndex + 1;
  const nextMatchup = state.matchups.at(nextIndex);
  if (nextMatchup !== undefined) {
    return {
      ...state,
      rev: state.rev + 1,
      phase: 'VOTING',
      matchupIndex: nextIndex,
      reveal: null,
      timer: { endsAt: now + state.config.votingMs, durationMs: state.config.votingMs },
    };
  }
  const leaderboard = buildLeaderboard(state.players);
  if (state.round < state.config.totalRounds) {
    return {
      ...state,
      rev: state.rev + 1,
      phase: 'LEADERBOARD',
      leaderboard,
      reveal: null,
      timer: { endsAt: now + state.config.leaderboardMs, durationMs: state.config.leaderboardMs },
    };
  }
  return {
    ...state,
    rev: state.rev + 1,
    phase: 'PODIUM',
    leaderboard,
    podium: buildPodium(state.players),
    reveal: null,
    timer: { ...IDLE_TIMER },
  };
}

function tick(state: HostState, now: number, random: RandomSource): HostState {
  const endsAt = state.timer.endsAt;
  if (endsAt === null || now < endsAt) return state;
  switch (state.phase) {
    case 'WRITING':
      return finishWriting(state, now, random);
    case 'VOTING':
      return finishVoting(state, now);
    case 'REVEAL':
      return finishReveal(state, now);
    case 'LEADERBOARD':
      return beginRound(state, now, random);
    default:
      return state;
  }
}

/* ------------------------------------------------------------------ */
/* Reducer autoritativo                                               */
/* ------------------------------------------------------------------ */

export function hostReducer(
  state: HostState,
  action: HostAction,
  random: RandomSource = Math.random,
): HostState {
  switch (action.type) {
    case 'PRESENCE': {
      const incoming = action.players.filter((meta) => meta.role === 'player');
      const players = mergePresence(state.players, incoming, action.now);
      if (sameRoster(state.players, players)) return state;
      return { ...state, rev: state.rev + 1, players };
    }

    case 'SUBMIT_ANSWER': {
      if (state.phase !== 'WRITING') return state;
      const text = action.payload.text.replace(/\s+/g, ' ').trim().slice(0, MAX_ANSWER_LENGTH);
      if (text.length === 0) return state;
      const player = state.players.find((entry) => entry.id === action.payload.playerId);
      if (player === undefined) return state;
      const index = state.matchups.findIndex((entry) => entry.id === action.payload.matchupId);
      const matchup = state.matchups[index];
      if (matchup === undefined) return state;
      if (!matchup.authorIds.includes(player.id) || hasAnswered(matchup, player.id)) return state;
      const answered: Matchup = {
        ...matchup,
        answers: [...matchup.answers, { playerId: player.id, text, auto: false }],
      };
      const matchups = state.matchups.map((entry, position) =>
        position === index ? answered : entry,
      );
      const players = state.players.map((entry) =>
        entry.id === player.id
          ? { ...entry, answersSubmitted: entry.answersSubmitted + 1 }
          : entry,
      );
      const next: HostState = { ...state, rev: state.rev + 1, matchups, players };
      return answersComplete(matchups) ? finishWriting(next, action.now, random) : next;
    }

    case 'CAST_VOTE': {
      if (state.phase !== 'VOTING') return state;
      const matchup = activeMatchup(state);
      if (matchup === null || matchup.id !== action.payload.matchupId) return state;
      const voter = state.players.find((entry) => entry.id === action.payload.playerId);
      if (voter === undefined || !voter.connected) return state;
      if (isAuthor(matchup, voter.id) || hasVoted(matchup, voter.id)) return state;
      const voted: Matchup = {
        ...matchup,
        votes: [...matchup.votes, { voterId: voter.id, slot: action.payload.slot, at: action.now }],
      };
      const matchups = state.matchups.map((entry, index) =>
        index === state.matchupIndex ? voted : entry,
      );
      const next: HostState = { ...state, rev: state.rev + 1, matchups };
      const eligible = eligibleVoterIds(next, voted);
      const everyoneVoted =
        eligible.length > 0 && eligible.every((id) => hasVoted(voted, id));
      return everyoneVoted ? finishVoting(next, action.now) : next;
    }

    case 'TICK':
      return tick(state, action.now, random);

    case 'START': {
      if (state.phase !== 'LOBBY') return state;
      const online = state.players.filter((player) => player.connected);
      if (online.length < state.config.minPlayers) return state;
      return beginRound(state, action.now, random);
    }

    case 'SKIP': {
      switch (state.phase) {
        case 'WRITING':
          return finishWriting(state, action.now, random);
        case 'VOTING':
          return finishVoting(state, action.now);
        case 'REVEAL':
          return finishReveal(state, action.now);
        case 'LEADERBOARD':
          return beginRound(state, action.now, random);
        default:
          return state;
      }
    }

    case 'END': {
      if (state.phase === 'LOBBY' || state.phase === 'PODIUM') return state;
      return {
        ...state,
        rev: state.rev + 1,
        phase: 'PODIUM',
        leaderboard: buildLeaderboard(state.players),
        podium: buildPodium(state.players),
        reveal: null,
        timer: { ...IDLE_TIMER },
      };
    }

    case 'RESTART': {
      const fresh = createHostState(state.roomCode, state.config);
      return {
        ...fresh,
        rev: state.rev + 1,
        players: state.players.map((player) => ({
          ...player,
          score: 0,
          answersSubmitted: 0,
          votesReceived: 0,
          ciberPlashes: 0,
        })),
      };
    }

    case 'NEW_ROOM': {
      const fresh = createHostState(action.roomCode, state.config);
      return { ...fresh, rev: state.rev + 1 };
    }

    default: {
      const exhaustive: never = action;
      void exhaustive;
      return state;
    }
  }
}

/* ------------------------------------------------------------------ */
/* Hook de orquestación: canal, reloj y publicación                    */
/* ------------------------------------------------------------------ */

export interface HostEngineActions {
  start: () => void;
  skip: () => void;
  end: () => void;
  restart: () => void;
  newRoom: () => void;
}

export interface HostEngine {
  state: HostState;
  connection: ConnectionStatus;
  error: string | null;
  actions: HostEngineActions;
}

export function useHostEngine(
  initialRoomCode?: RoomCode,
  config: GameConfig = DEFAULT_GAME_CONFIG,
): HostEngine {
  const randomRef = useRef<RandomSource>(Math.random);
  const initialCode = useMemo(() => initialRoomCode ?? generateRoomCode(), [initialRoomCode]);
  const [state, setState] = useState<HostState>(() => createHostState(initialCode, config));
  const stateRef = useRef<HostState>(state);
  stateRef.current = state;

  const channelRef = useRef<RealtimeChannel | null>(null);
  const [connection, setConnection] = useState<ConnectionStatus>('connecting');
  const [error, setError] = useState<string | null>(null);

  const commit = useCallback((action: HostAction): HostState => {
    const next = hostReducer(stateRef.current, action, randomRef.current);
    if (next === stateRef.current) return next;
    stateRef.current = next;
    setState(next);
    return next;
  }, []);

  const sendSyncFrom = useCallback((snapshot: HostState, playerId: PlayerId) => {
    const sync = toPlayerSync(snapshot, playerId);
    const channel = channelRef.current;
    if (sync === null || channel === null) return;
    void channel.send({ type: 'broadcast', event: REALTIME_EVENTS.PLAYER_SYNC, payload: sync });
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setConnection('error');
      setError(MISSING_CONFIG_MESSAGE);
      return;
    }
    const supabase = getSupabaseClient();
    if (supabase === null) {
      setConnection('error');
      setError(MISSING_CONFIG_MESSAGE);
      return;
    }

    const channel = createRoomChannel(supabase, state.roomCode, HOST_PRESENCE_KEY);
    channelRef.current = channel;
    setConnection('connecting');

    const syncPresence = () => {
      commit({ type: 'PRESENCE', players: collectPresence(channel), now: Date.now() });
    };

    channel
      .on('presence', { event: 'sync' }, syncPresence)
      .on('broadcast', { event: REALTIME_EVENTS.SUBMIT_ANSWER }, (message: { payload: unknown }) => {
        if (!isSubmitAnswerPayload(message.payload)) return;
        const next = commit({
          type: 'SUBMIT_ANSWER',
          payload: message.payload,
          now: Date.now(),
        });
        sendSyncFrom(next, message.payload.playerId);
      })
      .on('broadcast', { event: REALTIME_EVENTS.CAST_VOTE }, (message: { payload: unknown }) => {
        if (!isCastVotePayload(message.payload)) return;
        const next = commit({ type: 'CAST_VOTE', payload: message.payload, now: Date.now() });
        sendSyncFrom(next, message.payload.playerId);
      })
      .on('broadcast', { event: REALTIME_EVENTS.PLAYER_HELLO }, (message: { payload: unknown }) => {
        if (!isPlayerHelloPayload(message.payload)) return;
        const snapshot = stateRef.current;
        sendSyncFrom(snapshot, message.payload.playerId);
        void channel.send({
          type: 'broadcast',
          event: REALTIME_EVENTS.STATE,
          payload: {
            view: toPlayerView(snapshot, Date.now()),
          } satisfies StateBroadcast,
        });
      });

    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        setConnection('live');
        setError(null);
        void channel.track({
          playerId: 'host',
          alias: 'Host',
          role: 'host',
          joinedAt: Date.now(),
        });
        syncPresence();
        return;
      }
      if (status === 'TIMED_OUT') setConnection('reconnecting');
      if (status === 'CHANNEL_ERROR') setConnection('error');
      if (status === 'CLOSED') setConnection('offline');
    });

    return () => {
      channelRef.current = null;
      void supabase.removeChannel(channel);
    };
  }, [state.roomCode, commit, sendSyncFrom]);

  useEffect(() => {
    const channel = channelRef.current;
    if (channel === null || connection !== 'live') return;
    const payload: StateBroadcast = { view: toPlayerView(state, Date.now()) };
    void channel.send({ type: 'broadcast', event: REALTIME_EVENTS.STATE, payload });
  }, [state, connection]);

  useEffect(() => {
    if (connection !== 'live') return;
    for (const player of state.players) {
      const sync = toPlayerSync(state, player.id);
      if (sync === null) continue;
      void channelRef.current?.send({
        type: 'broadcast',
        event: REALTIME_EVENTS.PLAYER_SYNC,
        payload: sync,
      });
    }
  }, [state.round, state.phase, state.players.length, connection]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (connection !== 'live') return;
    const id = window.setInterval(() => {
      const channel = channelRef.current;
      if (channel === null) return;
      const snapshot = stateRef.current;
      const sentAt = Date.now();
      void channel.send({
        type: 'broadcast',
        event: REALTIME_EVENTS.STATE,
        payload: { view: toPlayerView(snapshot, sentAt) } satisfies StateBroadcast,
      });
      void channel.send({
        type: 'broadcast',
        event: REALTIME_EVENTS.HOST_HELLO,
        payload: { roomCode: snapshot.roomCode, sentAt },
      });
    }, HEARTBEAT_MS);
    return () => window.clearInterval(id);
  }, [connection]);

  useEffect(() => {
    const id = window.setInterval(() => {
      commit({ type: 'TICK', now: Date.now() });
    }, TICK_MS);
    return () => window.clearInterval(id);
  }, [commit]);

  const actions = useMemo<HostEngineActions>(
    () => ({
      start: () => {
        commit({ type: 'START', now: Date.now() });
      },
      skip: () => {
        commit({ type: 'SKIP', now: Date.now() });
      },
      end: () => {
        commit({ type: 'END', now: Date.now() });
      },
      restart: () => {
        commit({ type: 'RESTART', now: Date.now() });
      },
      newRoom: () => {
        commit({ type: 'NEW_ROOM', roomCode: generateRoomCode(), now: Date.now() });
      },
    }),
    [commit],
  );

  return { state, connection, error, actions };
}
