/**
 * BreachParty — contratos de dominio.
 * El host es la única fuente de verdad; este archivo define lo que viaja por
 * Broadcast y lo que se guarda en memoria. Sin dependencias de UI ni de red.
 */

export type PlayerId = string;
export type RoomCode = string;

export type PromptCategory = 'phishing' | 'privacy' | 'policy' | 'ops' | 'culture';

export interface GamePrompt {
  id: string;
  text: string;
  category: PromptCategory;
}

export const GAME_PHASES = [
  'LOBBY',
  'WRITING',
  'VOTING',
  'REVEAL',
  'LEADERBOARD',
  'PODIUM',
] as const;

export type GamePhase = (typeof GAME_PHASES)[number];

export type VoteSlot = 'A' | 'B';

export interface Player {
  id: PlayerId;
  alias: string;
  score: number;
  connected: boolean;
  joinedAt: number;
  answersSubmitted: number;
  votesReceived: number;
  ciberPlashes: number;
}

export type PublicPlayer = Player;

export interface AssignedPrompt {
  matchupId: string;
  promptId: string;
  prompt: string;
  category: PromptCategory;
}

export interface AnswerEntry {
  playerId: PlayerId;
  text: string;
  auto: boolean;
}

export interface VoteEntry {
  voterId: PlayerId;
  slot: VoteSlot;
  at: number;
}

export interface MatchupScore {
  playerId: PlayerId;
  slot: VoteSlot;
  votes: number;
  percent: number;
  points: number;
  ciberPlash: boolean;
}

export interface MatchupResult {
  totalVotes: number;
  scores: [MatchupScore, MatchupScore];
}

export interface Matchup {
  id: string;
  promptId: string;
  prompt: string;
  category: PromptCategory;
  /** Autores en el orden del anillo, alineados con `order`. */
  authorIds: [PlayerId, PlayerId];
  /** Autor que ocupa el slot A y el slot B en la presentación anónima. */
  order: [PlayerId, PlayerId];
  answers: AnswerEntry[];
  autoFilled: PlayerId[];
  votes: VoteEntry[];
  result: MatchupResult | null;
}

/* ------------------------------------------------------------------ */
/* Proyección pública (lo único que reciben los móviles)               */
/* ------------------------------------------------------------------ */

export interface VoteOptionView {
  slot: VoteSlot;
  text: string;
}

export interface MatchupView {
  id: string;
  /** 1-based, para "Duelo 2 de 5". */
  index: number;
  total: number;
  prompt: string;
  options: [VoteOptionView, VoteOptionView];
  eligibleVoters: number;
  votesCast: number;
}

export interface RevealOptionView {
  slot: VoteSlot;
  playerId: PlayerId;
  text: string;
  alias: string;
  votes: number;
  percent: number;
  points: number;
  ciberPlash: boolean;
}

export interface RevealView {
  prompt: string;
  options: [RevealOptionView, RevealOptionView];
  totalVotes: number;
  round: number;
}

export interface LeaderboardEntry {
  rank: number;
  playerId: PlayerId;
  alias: string;
  score: number;
}

export interface PodiumEntry {
  rank: number;
  playerId: PlayerId;
  alias: string;
  score: number;
  title: string;
}

export interface PodiumAward {
  label: string;
  alias: string;
  detail: string;
}

export interface PodiumPayload {
  entries: PodiumEntry[];
  awards: PodiumAward[];
}

export interface TimerState {
  endsAt: number | null;
  durationMs: number | null;
}

export interface PlayerView {
  rev: number;
  roomCode: RoomCode;
  phase: GamePhase;
  round: number;
  totalRounds: number;
  /** Reloj del host al emitir: permite compensar el skew del móvil. */
  sentAt: number;
  players: PublicPlayer[];
  timer: TimerState;
  matchup: MatchupView | null;
  reveal: RevealView | null;
  leaderboard: LeaderboardEntry[];
  podium: PodiumPayload | null;
  answerProgress: { submitted: number; total: number };
}

/* ------------------------------------------------------------------ */
/* Realtime (Broadcast + Presence)                                     */
/* ------------------------------------------------------------------ */

export const REALTIME_EVENTS = {
  STATE: 'state',
  PLAYER_SYNC: 'player-sync',
  SUBMIT_ANSWER: 'submit-answer',
  CAST_VOTE: 'cast-vote',
  PLAYER_HELLO: 'player-hello',
  HOST_HELLO: 'host-hello',
} as const;

export interface StateBroadcast {
  view: PlayerView;
}

export interface PlayerSync {
  playerId: PlayerId;
  phase: GamePhase;
  round: number;
  alias: string;
  score: number;
  /** `false` cuando la sala ya arrancó y el jugador entra en la próxima ronda. */
  admitted: boolean;
  prompts: AssignedPrompt[];
  submittedMatchupIds: string[];
  votedMatchupIds: string[];
}

export interface HostHelloPayload {
  roomCode: RoomCode;
  sentAt: number;
}

export interface PlayerHelloPayload {
  playerId: PlayerId;
  alias: string;
}

export interface SubmitAnswerPayload {
  playerId: PlayerId;
  matchupId: string;
  text: string;
}

export interface CastVotePayload {
  playerId: PlayerId;
  matchupId: string;
  slot: VoteSlot;
}

export interface PresenceMeta {
  playerId: PlayerId;
  alias: string;
  role: 'host' | 'player';
  joinedAt: number;
}

export type ConnectionStatus =
  | 'idle'
  | 'connecting'
  | 'live'
  | 'reconnecting'
  | 'offline'
  | 'error';

/* ------------------------------------------------------------------ */
/* Estado autoritativo del host                                        */
/* ------------------------------------------------------------------ */

export interface GameConfig {
  totalRounds: number;
  writingMs: number;
  votingMs: number;
  revealMs: number;
  leaderboardMs: number;
  minPlayers: number;
}

export const DEFAULT_GAME_CONFIG: GameConfig = {
  totalRounds: 2,
  writingMs: 60_000,
  votingMs: 20_000,
  revealMs: 8_000,
  leaderboardMs: 10_000,
  minPlayers: 3,
};

export interface PlayerAssignment {
  playerId: PlayerId;
  prompts: AssignedPrompt[];
}

export interface HostState {
  rev: number;
  roomCode: RoomCode;
  phase: GamePhase;
  round: number;
  config: GameConfig;
  players: Player[];
  assignments: PlayerAssignment[];
  matchups: Matchup[];
  matchupIndex: number;
  usedPromptIds: string[];
  reveal: RevealView | null;
  leaderboard: LeaderboardEntry[];
  podium: PodiumPayload | null;
  timer: TimerState;
  startedAt: number | null;
}

export type HostAction =
  | { type: 'PRESENCE'; players: PresenceMeta[]; now: number }
  | { type: 'SUBMIT_ANSWER'; payload: SubmitAnswerPayload; now: number }
  | { type: 'CAST_VOTE'; payload: CastVotePayload; now: number }
  | { type: 'TICK'; now: number }
  | { type: 'START'; now: number }
  | { type: 'SKIP'; now: number }
  | { type: 'END'; now: number }
  | { type: 'RESTART'; now: number }
  | { type: 'NEW_ROOM'; roomCode: RoomCode; now: number };

export type SoundName =
  | 'click'
  | 'join'
  | 'tick'
  | 'whoosh'
  | 'vote'
  | 'reveal'
  | 'victory'
  | 'error';

export const MAX_ANSWER_LENGTH = 140;
export const MAX_ALIAS_LENGTH = 16;
