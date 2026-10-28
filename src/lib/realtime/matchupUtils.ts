import type { Matchup, PlayerId } from '../../types/game';

export type VoteCounts = { A: number; B: number };

export function answerText(matchup: Matchup, playerId: PlayerId): string | null {
  const answer = matchup.answers.find((entry) => entry.playerId === playerId);
  return answer?.text ?? null;
}

export function voteCountsFor(matchup: Matchup): VoteCounts {
  const counts: VoteCounts = { A: 0, B: 0 };
  for (const vote of matchup.votes) {
    if (vote.slot === 'A') counts.A += 1;
    else counts.B += 1;
  }
  return counts;
}

export function slotOfAuthor(matchup: Matchup, playerId: PlayerId): 'A' | 'B' | null {
  if (matchup.order[0] === playerId) return 'A';
  if (matchup.order[1] === playerId) return 'B';
  return null;
}

export function isAuthor(matchup: Matchup, playerId: PlayerId): boolean {
  return slotOfAuthor(matchup, playerId) !== null;
}

export function hasAnswered(matchup: Matchup, playerId: PlayerId): boolean {
  return matchup.answers.some((answer) => answer.playerId === playerId);
}

export function hasVoted(matchup: Matchup, playerId: PlayerId): boolean {
  return matchup.votes.some((vote) => vote.voterId === playerId);
}
