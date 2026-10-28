import type {
  CastVotePayload,
  HostHelloPayload,
  PlayerHelloPayload,
  PlayerSync,
  StateBroadcast,
  SubmitAnswerPayload,
} from '../../types/game';

type UnknownRecord = Record<string, unknown>;

export function asRecord(value: unknown): UnknownRecord | null {
  if (typeof value !== 'object' || value === null) return null;
  return value as UnknownRecord;
}

function hasString(record: UnknownRecord, key: string): boolean {
  return typeof record[key] === 'string';
}

function hasNumber(record: UnknownRecord, key: string): boolean {
  return typeof record[key] === 'number';
}

export function isStateBroadcast(value: unknown): value is StateBroadcast {
  const record = asRecord(value);
  if (record === null) return false;
  const view = asRecord(record.view);
  if (view === null) return false;
  return hasString(view, 'roomCode') && hasString(view, 'phase') && hasNumber(view, 'rev');
}

export function isPlayerSync(value: unknown): value is PlayerSync {
  const record = asRecord(value);
  if (record === null) return false;
  return (
    hasString(record, 'playerId') &&
    hasString(record, 'phase') &&
    Array.isArray(record.prompts) &&
    Array.isArray(record.submittedMatchupIds) &&
    Array.isArray(record.votedMatchupIds)
  );
}

export function isSubmitAnswerPayload(value: unknown): value is SubmitAnswerPayload {
  const record = asRecord(value);
  if (record === null) return false;
  return hasString(record, 'playerId') && hasString(record, 'matchupId') && hasString(record, 'text');
}

export function isCastVotePayload(value: unknown): value is CastVotePayload {
  const record = asRecord(value);
  if (record === null) return false;
  return (
    hasString(record, 'playerId') &&
    hasString(record, 'matchupId') &&
    (record.slot === 'A' || record.slot === 'B')
  );
}

export function isPlayerHelloPayload(value: unknown): value is PlayerHelloPayload {
  const record = asRecord(value);
  if (record === null) return false;
  return hasString(record, 'playerId') && hasString(record, 'alias');
}

export function isHostHelloPayload(value: unknown): value is HostHelloPayload {
  const record = asRecord(value);
  if (record === null) return false;
  return hasString(record, 'roomCode') && hasNumber(record, 'sentAt');
}
