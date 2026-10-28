import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createClient, type RealtimeChannel, type SupabaseClient } from '@supabase/supabase-js';
import { createHostState } from '../../hooks/useHostEngine';
import { REALTIME_EVENTS } from '../../types/game';
import { collectPresence, createRoomChannel } from './channel';
import { isStateBroadcast, isSubmitAnswerPayload } from './protocol';
import { toPlayerView } from './view';

function readEnvFile(): Record<string, string> {
  const values: Record<string, string> = {};
  try {
    for (const line of readFileSync('.env', 'utf8').split('\n')) {
      const match = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
      if (match === null) continue;
      values[match[1]] = match[2].replace(/^["']|["']$/g, '');
    }
  } catch {
    return values;
  }
  return values;
}

const env = readEnvFile();
const url = env.PUBLIC_SUPABASE_URL ?? '';
const key = env.PUBLIC_SUPABASE_ANON_KEY ?? '';
const enabled = process.env.REALTIME_E2E === '1' && url.length > 0 && key.length > 0;

function client(): SupabaseClient {
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    realtime: { params: { eventsPerSecond: 20 } },
  });
}

function subscribe(channel: RealtimeChannel): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('subscribe timeout')), 10_000);
    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        clearTimeout(timer);
        resolve();
        return;
      }
      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        clearTimeout(timer);
        reject(new Error(`channel ${status}`));
      }
    });
  });
}

async function waitFor(predicate: () => boolean, timeoutMs = 8000): Promise<void> {
  const started = Date.now();
  while (!predicate()) {
    if (Date.now() - started > timeoutMs) throw new Error('waitFor timeout');
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
}

describe.skipIf(!enabled)('supabase realtime', () => {
  it('intercambia Presence y Broadcast en un canal público', async () => {
    expect(url).not.toBe('');
    expect(key).not.toBe('');

    const room = `T${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    const hostClient = client();
    const playerClient = client();
    const host = createRoomChannel(hostClient, room, 'host');
    const player = createRoomChannel(playerClient, room, 'p-test');

    const receivedByPlayer: unknown[] = [];
    const receivedByHost: unknown[] = [];
    let playerSeen = false;

    host.on('presence', { event: 'sync' }, () => {
      if (collectPresence(host).some((meta) => meta.playerId === 'p-test')) playerSeen = true;
    });
    player.on('broadcast', { event: REALTIME_EVENTS.STATE }, (message) => {
      receivedByPlayer.push(message.payload);
    });
    host.on('broadcast', { event: REALTIME_EVENTS.SUBMIT_ANSWER }, (message) => {
      receivedByHost.push(message.payload);
    });

    await subscribe(host);
    await subscribe(player);
    await host.track({ playerId: 'host', alias: 'Host', role: 'host', joinedAt: Date.now() });
    await player.track({ playerId: 'p-test', alias: 'Tester', role: 'player', joinedAt: Date.now() });

    await waitFor(() => playerSeen, 10_000);

    const view = toPlayerView(createHostState(room), Date.now());
    await host.send({
      type: 'broadcast',
      event: REALTIME_EVENTS.STATE,
      payload: { view },
    });
    await waitFor(() => receivedByPlayer.length > 0);
    const statePayload = receivedByPlayer[0];
    expect(isStateBroadcast(statePayload)).toBe(true);
    if (isStateBroadcast(statePayload)) {
      expect(statePayload.view.roomCode).toBe(room);
      expect(statePayload.view.phase).toBe('LOBBY');
    }

    await player.send({
      type: 'broadcast',
      event: REALTIME_EVENTS.SUBMIT_ANSWER,
      payload: { playerId: 'p-test', matchupId: 'r1m1', text: 'Probando el canal' },
    });
    await waitFor(() => receivedByHost.length > 0);
    expect(isSubmitAnswerPayload(receivedByHost[0])).toBe(true);

    await hostClient.removeChannel(host);
    await playerClient.removeChannel(player);
  }, 30_000);
});
