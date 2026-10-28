import { create } from 'zustand';
import type {
  ConnectionStatus,
  PlayerId,
  PlayerSync,
  PlayerView,
  RoomCode,
} from '../types/game';

export interface GameStore {
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
  setView: (view: PlayerView | null) => void;
  setSync: (sync: PlayerSync | null) => void;
  setConnection: (connection: ConnectionStatus) => void;
  setError: (error: string | null) => void;
  setHostAlive: (alive: boolean) => void;
  setIdentity: (identity: { roomCode: RoomCode; playerId: PlayerId; alias: string }) => void;
  markSubmitted: (matchupId: string) => void;
  markVoted: (matchupId: string) => void;
  reset: () => void;
}

const initialState = {
  view: null,
  sync: null,
  connection: 'idle' as ConnectionStatus,
  error: null,
  hostAlive: false,
  roomCode: null,
  playerId: null,
  alias: null,
  submittedMatchupIds: [],
  votedMatchupIds: [],
};

function withUnique(list: string[], value: string): string[] {
  return list.includes(value) ? list : [...list, value];
}

export const useGameStore = create<GameStore>()((set) => ({
  ...initialState,
  setView: (view) => set({ view }),
  setSync: (sync) => set({ sync }),
  setConnection: (connection) => set({ connection }),
  setError: (error) => set({ error }),
  setHostAlive: (hostAlive) => set({ hostAlive }),
  setIdentity: ({ roomCode, playerId, alias }) => set({ roomCode, playerId, alias }),
  markSubmitted: (matchupId) =>
    set((state) => ({ submittedMatchupIds: withUnique(state.submittedMatchupIds, matchupId) })),
  markVoted: (matchupId) =>
    set((state) => ({ votedMatchupIds: withUnique(state.votedMatchupIds, matchupId) })),
  reset: () => set({ ...initialState }),
}));
