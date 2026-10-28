import type {
  LeaderboardEntry,
  Matchup,
  MatchupView,
  Player,
  PlayerId,
  PlayerSync,
  PlayerView,
  PodiumAward,
  PodiumEntry,
  PodiumPayload,
  RevealOptionView,
  RevealView,
} from '../../types/game';
import { answerText, voteCountsFor } from './matchupUtils';

export const PODIUM_TITLES = [
  'CISO del Caos',
  'Oficial de Cumplimiento Improvisado',
  'Analista Junior con Acceso Root',
] as const;

export function activeMatchup(state: { matchups: Matchup[]; matchupIndex: number }): Matchup | null {
  return state.matchups.at(state.matchupIndex) ?? null;
}

export function eligibleVoterIds(state: { players: Player[] }, matchup: Matchup): PlayerId[] {
  return state.players
    .filter((player) => !matchup.order.includes(player.id))
    .filter(
      (player) =>
        player.connected || matchup.votes.some((vote) => vote.voterId === player.id),
    )
    .map((player) => player.id);
}

function aliasOf(players: Player[], playerId: PlayerId): string {
  return players.find((player) => player.id === playerId)?.alias ?? 'Jugador fantasma';
}

function comparePlayers(a: Player, b: Player): number {
  if (b.score !== a.score) return b.score - a.score;
  return a.alias.localeCompare(b.alias, 'es');
}

export function buildLeaderboard(players: Player[]): LeaderboardEntry[] {
  const sorted = [...players].sort(comparePlayers);
  let previousScore: number | null = null;
  let previousRank = 0;
  return sorted.map((player, index) => {
    const rank = previousScore !== null && player.score === previousScore ? previousRank : index + 1;
    previousScore = player.score;
    previousRank = rank;
    return { rank, playerId: player.id, alias: player.alias, score: player.score };
  });
}

function topBy(players: Player[], pick: (player: Player) => number): Player | null {
  let best: Player | null = null;
  for (const player of players) {
    if (pick(player) <= 0) continue;
    if (best === null || pick(player) > pick(best)) best = player;
  }
  return best;
}

function buildAwards(players: Player[]): PodiumAward[] {
  const awards: PodiumAward[] = [];
  const ciber = topBy(players, (player) => player.ciberPlashes);
  if (ciber !== null) {
    awards.push({
      label: 'Ciber-Plash',
      alias: ciber.alias,
      detail: `${ciber.ciberPlashes} ${ciber.ciberPlashes === 1 ? 'duelo' : 'duelos'} con el 100% de los votos`,
    });
  }
  const magnet = topBy(players, (player) => player.votesReceived);
  if (magnet !== null) {
    awards.push({
      label: 'Imán de votos',
      alias: magnet.alias,
      detail: `${magnet.votesReceived} votos recibidos`,
    });
  }
  const fast = topBy(players, (player) => player.answersSubmitted);
  if (fast !== null) {
    awards.push({
      label: 'Pluma veloz',
      alias: fast.alias,
      detail: `${fast.answersSubmitted} respuestas enviadas`,
    });
  }
  return awards;
}

export function buildPodium(players: Player[]): PodiumPayload {
  const leaderboard = buildLeaderboard(players).slice(0, 3);
  const entries: PodiumEntry[] = leaderboard.map((entry, index) => ({
    rank: index + 1,
    playerId: entry.playerId,
    alias: entry.alias,
    score: entry.score,
    title: PODIUM_TITLES[index] ?? 'Mención honorífica del comité',
  }));
  return { entries, awards: buildAwards(players) };
}

export function buildRevealView(
  matchup: Matchup,
  players: Player[],
  round: number,
): RevealView | null {
  const result = matchup.result;
  if (result === null) return null;

  const toOption = (score: (typeof result.scores)[number]): RevealOptionView => ({
    slot: score.slot,
    playerId: score.playerId,
    text: answerText(matchup, score.playerId) ?? '',
    alias: aliasOf(players, score.playerId),
    votes: score.votes,
    percent: score.percent,
    points: score.points,
    ciberPlash: score.ciberPlash,
  });

  return {
    prompt: matchup.prompt,
    options: [toOption(result.scores[0]), toOption(result.scores[1])],
    totalVotes: result.totalVotes,
    round,
  };
}

export function toMatchupView(state: {
  players: Player[];
  matchups: Matchup[];
  matchupIndex: number;
}): MatchupView | null {
  const matchup = activeMatchup(state);
  if (matchup === null) return null;
  const optionA = answerText(matchup, matchup.order[0]);
  const optionB = answerText(matchup, matchup.order[1]);
  if (optionA === null || optionB === null) return null;
  const counts = voteCountsFor(matchup);
  return {
    id: matchup.id,
    index: state.matchupIndex + 1,
    total: state.matchups.length,
    prompt: matchup.prompt,
    options: [
      { slot: 'A', text: optionA },
      { slot: 'B', text: optionB },
    ],
    eligibleVoters: eligibleVoterIds(state, matchup).length,
    votesCast: counts.A + counts.B,
  };
}

export function toPlayerView(
  state: {
    rev: number;
    roomCode: string;
    phase: PlayerView['phase'];
    round: number;
    config: { totalRounds: number };
    players: Player[];
    timer: PlayerView['timer'];
    matchups: Matchup[];
    matchupIndex: number;
    reveal: RevealView | null;
    leaderboard: LeaderboardEntry[];
    podium: PodiumPayload | null;
  },
  sentAt: number,
): PlayerView {
  const allowMatchup = state.phase === 'VOTING';
  const submitted = state.matchups.reduce((total, matchup) => total + matchup.answers.length, 0);
  return {
    rev: state.rev,
    roomCode: state.roomCode,
    phase: state.phase,
    round: state.round,
    totalRounds: state.config.totalRounds,
    sentAt,
    players: state.players.map((player) => ({ ...player })),
    timer: state.timer,
    matchup: allowMatchup ? toMatchupView(state) : null,
    reveal: state.phase === 'REVEAL' ? state.reveal : null,
    leaderboard: state.leaderboard,
    podium: state.podium,
    answerProgress: { submitted, total: state.matchups.length * 2 },
  };
}

export function toPlayerSync(
  state: {
    phase: PlayerView['phase'];
    round: number;
    players: Player[];
    assignments: { playerId: PlayerId; prompts: PlayerSync['prompts'] }[];
    matchups: Matchup[];
  },
  playerId: PlayerId,
): PlayerSync | null {
  const player = state.players.find((candidate) => candidate.id === playerId);
  if (player === undefined) return null;
  const assignment = state.assignments.find((entry) => entry.playerId === playerId);
  return {
    playerId,
    phase: state.phase,
    round: state.round,
    alias: player.alias,
    score: player.score,
    admitted: state.phase === 'LOBBY' || state.phase === 'PODIUM' || assignment !== undefined,
    prompts: assignment?.prompts ?? [],
    submittedMatchupIds: state.matchups
      .filter((matchup) => matchup.answers.some((answer) => answer.playerId === playerId))
      .map((matchup) => matchup.id),
    votedMatchupIds: state.matchups
      .filter((matchup) => matchup.votes.some((vote) => vote.voterId === playerId))
      .map((matchup) => matchup.id),
  };
}
