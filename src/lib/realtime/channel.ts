import type { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';
import type { PresenceMeta, RoomCode } from '../../types/game';

export const ROOM_CHANNEL_PREFIX = 'breachparty';
export const HOST_PRESENCE_KEY = 'host';

export function roomChannelName(code: RoomCode): string {
  return `${ROOM_CHANNEL_PREFIX}:${code}`;
}

/**
 * Un canal por sala. `presenceKey` es único por cliente (host o playerId) para
 * que dos pestañas del mismo jugador no colisionen en Presence.
 */
export function createRoomChannel(
  supabase: SupabaseClient,
  code: RoomCode,
  presenceKey: string,
): RealtimeChannel {
  return supabase.channel(roomChannelName(code), {
    config: {
      broadcast: { self: false, ack: false },
      presence: { key: presenceKey },
    },
  });
}

function readString(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function toPresenceMeta(value: unknown): PresenceMeta | null {
  if (typeof value !== 'object' || value === null) return null;
  const record = value as Record<string, unknown>;
  const playerId = readString(record.playerId);
  const alias = readString(record.alias);
  const role = record.role;
  if (playerId === null || alias === null) return null;
  if (role !== 'host' && role !== 'player') return null;
  const joinedAt = typeof record.joinedAt === 'number' ? record.joinedAt : Date.now();
  return { playerId, alias, role, joinedAt };
}

/** Lee el estado de Presence actual, descartando entradas malformadas. */
export function collectPresence(channel: RealtimeChannel): PresenceMeta[] {
  const state = channel.presenceState<Record<string, unknown>>();
  const metas: PresenceMeta[] = [];
  for (const entries of Object.values(state)) {
    for (const entry of entries) {
      const meta = toPresenceMeta(entry);
      if (meta !== null) metas.push(meta);
    }
  }
  return metas;
}

export function hasHostPresence(channel: RealtimeChannel): boolean {
  return collectPresence(channel).some((meta) => meta.role === 'host');
}
