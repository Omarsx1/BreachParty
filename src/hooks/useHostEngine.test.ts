import { describe, expect, it } from 'vitest';
import {
  buildAssignments,
  buildMatchups,
  computeMatchupResult,
  createHostState,
  hostReducer,
} from './useHostEngine';
import { DEFAULT_GAME_CONFIG } from '../types/game';
import type { GamePrompt, HostState, Matchup, Player, PresenceMeta } from '../types/game';
import { eligibleVoterIds } from '../lib/realtime/view';

const RNG_SEED = 20261028;

function seeded(seed = RNG_SEED): () => number {
  let value = seed;
  return () => {
    value = (value * 1664525 + 1013904223) % 4294967296;
    return value / 4294967296;
  };
}

function presence(count: number, aliases?: string[]): PresenceMeta[] {
  return Array.from({ length: count }, (_, index) => ({
    playerId: `p${index + 1}`,
    alias: aliases?.[index] ?? `Jugador ${index + 1}`,
    role: 'player' as const,
    joinedAt: 1000 + index,
  }));
}

function hostWith(count: number): HostState {
  const rng = seeded();
  return hostReducer(
    createHostState('TEST'),
    { type: 'PRESENCE', players: presence(count), now: 1000 },
    rng,
  );
}

function started(count = 3): HostState {
  const rng = seeded();
  return hostReducer(hostWith(count), { type: 'START', now: 10_000 }, rng);
}

function matchupAt(state: HostState): Matchup {
  const matchup = state.matchups[state.matchupIndex];
  if (matchup === undefined) throw new Error('Sin duelo activo');
  return matchup;
}

function answerEverything(state: HostState): HostState {
  const rng = seeded(99);
  let current = state;
  for (const assignment of state.assignments) {
    for (const prompt of assignment.prompts) {
      current = hostReducer(
        current,
        {
          type: 'SUBMIT_ANSWER',
          payload: {
            playerId: assignment.playerId,
            matchupId: prompt.matchupId,
            text: `Respuesta de ${assignment.playerId}`,
          },
          now: 20_000,
        },
        rng,
      );
    }
  }
  return current;
}

function voteAll(state: HostState, slot: 'A' | 'B'): HostState {
  const rng = seeded(7);
  let current = state;
  const matchup = matchupAt(state);
  const voters = state.players.filter(
    (player) => !matchup.authorIds.includes(player.id) && player.connected,
  );
  for (const voter of voters) {
    current = hostReducer(
      current,
      { type: 'CAST_VOTE', payload: { playerId: voter.id, matchupId: matchup.id, slot }, now: 25_000 },
      rng,
    );
  }
  return current;
}

describe('emparejamiento en anillo', () => {
  const players: Player[] = presence(4).map((meta) => ({
    id: meta.playerId,
    alias: meta.alias,
    score: 0,
    connected: true,
    joinedAt: meta.joinedAt,
    answersSubmitted: 0,
    votesReceived: 0,
    ciberPlashes: 0,
  }));
  const prompts: GamePrompt[] = ['Riesgo', 'Phishing', 'ARCO', 'Firewall'].map((text, index) => ({
    id: `pr${index}`,
    text,
    category: 'policy',
  }));

  it('genera un duelo por jugador con dos autores distintos', () => {
    const matchups = buildMatchups(players, prompts, seeded(), 2);
    expect(matchups).toHaveLength(4);
    for (const matchup of matchups) {
      expect(matchup.authorIds[0]).not.toBe(matchup.authorIds[1]);
      expect(matchup.id.startsWith('r2m')).toBe(true);
    }
  });

  it('asigna exactamente 2 prompts a cada jugador', () => {
    const matchups = buildMatchups(players, prompts, seeded(), 1);
    const assignments = buildAssignments(players, matchups);
    expect(assignments).toHaveLength(4);
    for (const assignment of assignments) {
      expect(assignment.prompts).toHaveLength(2);
      for (const prompt of assignment.prompts) {
        expect(prompt.matchupId).toMatch(/^r1m[1-4]$/);
      }
    }
  });

  it('no crea duelos con menos de dos jugadores', () => {
    expect(buildMatchups([players[0] as Player], prompts, seeded(), 1)).toHaveLength(0);
  });
});

describe('puntajes y Ciber-Plash', () => {
  const base: Matchup = {
    id: 'r1m1',
    promptId: 'p01',
    prompt: 'Prompt de prueba',
    category: 'culture',
    authorIds: ['p1', 'p2'],
    order: ['p1', 'p2'],
    answers: [
      { playerId: 'p1', text: 'A', auto: false },
      { playerId: 'p2', text: 'B', auto: false },
    ],
    autoFilled: [],
    votes: [],
    result: null,
  };

  it('suma +100 por voto y calcula porcentajes', () => {
    const result = computeMatchupResult({
      ...base,
      votes: [
        { voterId: 'p3', slot: 'A', at: 1 },
        { voterId: 'p4', slot: 'A', at: 2 },
        { voterId: 'p5', slot: 'B', at: 3 },
      ],
    });
    expect(result.totalVotes).toBe(3);
    expect(result.scores[0]).toMatchObject({ votes: 2, percent: 67, points: 200, ciberPlash: false });
    expect(result.scores[1]).toMatchObject({ votes: 1, percent: 33, points: 100, ciberPlash: false });
  });

  it('otorga +250 cuando el 100% de los votos va a una respuesta', () => {
    const result = computeMatchupResult({
      ...base,
      votes: [
        { voterId: 'p3', slot: 'A', at: 1 },
        { voterId: 'p4', slot: 'A', at: 2 },
      ],
    });
    expect(result.scores[0]).toMatchObject({ votes: 2, percent: 100, points: 450, ciberPlash: true });
    expect(result.scores[1]).toMatchObject({ votes: 0, percent: 0, points: 0, ciberPlash: false });
  });

  it('no inventa ganador cuando nadie vota', () => {
    const result = computeMatchupResult(base);
    expect(result.totalVotes).toBe(0);
    expect(result.scores[0].ciberPlash).toBe(false);
    expect(result.scores[0].points).toBe(0);
  });
});

describe('reducer autoritativo', () => {
  it('rechaza iniciar con menos del mínimo de jugadores', () => {
    const state = hostReducer(hostWith(2), { type: 'START', now: 5000 }, seeded());
    expect(state.phase).toBe('LOBBY');
  });

  it('inicia en WRITING con el reloj de 60s y 2 prompts por jugador', () => {
    const state = started(3);
    expect(state.phase).toBe('WRITING');
    expect(state.round).toBe(1);
    expect(state.timer.endsAt).toBe(70_000);
    expect(state.timer.durationMs).toBe(DEFAULT_GAME_CONFIG.writingMs);
    expect(state.matchups).toHaveLength(3);
    expect(state.assignments.every((assignment) => assignment.prompts.length === 2)).toBe(true);
  });

  it('avanza a VOTING solo cuando están las 6 respuestas', () => {
    const partial = started(3);
    const rng = seeded(3);
    const first = hostReducer(
      partial,
      {
        type: 'SUBMIT_ANSWER',
        payload: {
          playerId: partial.assignments[0]?.playerId ?? 'p1',
          matchupId: partial.assignments[0]?.prompts[0]?.matchupId ?? '',
          text: 'Una respuesta',
        },
        now: 15_000,
      },
      rng,
    );
    expect(first.phase).toBe('WRITING');

    const complete = answerEverything(partial);
    expect(complete.phase).toBe('VOTING');
    expect(complete.matchups.every((matchup) => matchup.answers.length === 2)).toBe(true);
  });

  it('ignora respuestas duplicadas y de autores ajenos', () => {
    const state = started(3);
    const assignment = state.assignments[0];
    if (assignment === undefined || assignment.prompts[0] === undefined) throw new Error('Sin prompts');
    const payload = {
      playerId: assignment.playerId,
      matchupId: assignment.prompts[0].matchupId,
      text: 'Primera',
    };
    const once = hostReducer(state, { type: 'SUBMIT_ANSWER', payload, now: 12_000 }, seeded());
    const twice = hostReducer(once, { type: 'SUBMIT_ANSWER', payload, now: 12_500 }, seeded());
    expect(twice.matchups).toEqual(once.matchups);

    const foreign = hostReducer(
      state,
      {
        type: 'SUBMIT_ANSWER',
        payload: { playerId: 'p3', matchupId: assignment.prompts[0].matchupId, text: 'Intruso' },
        now: 12_000,
      },
      seeded(),
    );
    expect(foreign.matchups).toEqual(state.matchups);
  });

  it('revela autores, porcentajes y suma puntos', () => {
    const voting = answerEverything(started(3));
    const matchup = matchupAt(voting);
    const revealed = voteAll(voting, 'A');

    expect(revealed.phase).toBe('REVEAL');
    expect(revealed.reveal).not.toBeNull();
    expect(revealed.reveal?.options[0].percent).toBe(100);
    expect(revealed.reveal?.options[0].playerId).toBe(matchup.order[0]);
    expect(revealed.reveal?.options[0].points).toBe(350);
    const author = revealed.players.find((player) => player.id === matchup.order[0]);
    expect(author?.score).toBe(350);
    expect(author?.ciberPlashes).toBe(1);
  });

  it('impide que un autor vote en su propio duelo', () => {
    const voting = answerEverything(started(3));
    const matchup = matchupAt(voting);
    const afterAuthorVote = hostReducer(
      voting,
      {
        type: 'CAST_VOTE',
        payload: { playerId: matchup.order[0], matchupId: matchup.id, slot: 'A' },
        now: 21_000,
      },
      seeded(),
    );
    expect(afterAuthorVote).toBe(voting);
  });

  it('autocompleta respuestas faltantes cuando vence el reloj', () => {
    const writing = started(3);
    const endsAt = writing.timer.endsAt ?? 0;
    const voting = hostReducer(writing, { type: 'TICK', now: endsAt }, seeded());
    expect(voting.phase).toBe('VOTING');
    expect(voting.matchups.every((matchup) => matchup.answers.length === 2)).toBe(true);
    const autoFilled = voting.matchups.flatMap((matchup) => matchup.autoFilled);
    expect(autoFilled).toHaveLength(6);
  });

  it('no muta el estado antes de que venza el reloj', () => {
    const writing = started(3);
    const same = hostReducer(writing, { type: 'TICK', now: 10_100 }, seeded());
    expect(same).toBe(writing);
  });

  it('recorre REVEAL, LEADERBOARD y PODIUM en 2 rondas', () => {
    let state = voteAll(answerEverything(started(3)), 'B');
    expect(state.phase).toBe('REVEAL');

    while (state.phase !== 'LEADERBOARD') {
      state = hostReducer(state, { type: 'SKIP', now: 30_000 }, seeded());
    }
    expect(state.phase).toBe('LEADERBOARD');
    expect(state.leaderboard.length).toBe(3);

    const roundTwo = hostReducer(state, { type: 'SKIP', now: 30_500 }, seeded());
    expect(roundTwo.phase).toBe('WRITING');
    expect(roundTwo.round).toBe(2);
    expect(roundTwo.matchups[0]?.id.startsWith('r2m')).toBe(true);
  });

  it('reinicia la partida conservando el roster', () => {
    const midGame = answerEverything(started(3));
    const restarted = hostReducer(midGame, { type: 'RESTART', now: 40_000 }, seeded());
    expect(restarted.phase).toBe('LOBBY');
    expect(restarted.players).toHaveLength(3);
    expect(restarted.players.every((player) => player.score === 0)).toBe(true);
    expect(restarted.matchups).toHaveLength(0);
  });
});

describe('presencia y reconexión', () => {
  it('marca desconectados sin perder el puntaje', () => {
    const scored = voteAll(answerEverything(started(3)), 'A');
    const author = scored.players.find((player) => player.score > 0);
    expect(author).toBeDefined();

    const metas = presence(2);
    const offline = hostReducer(
      scored,
      { type: 'PRESENCE', players: metas, now: 50_000 },
      seeded(),
    );
    const missing = offline.players.find((player) => player.id === 'p3');
    expect(missing?.connected).toBe(false);
    expect(missing?.score).toBe(0);

    const online = hostReducer(offline, { type: 'PRESENCE', players: presence(3), now: 51_000 }, seeded());
    expect(online.players.find((player) => player.id === 'p3')?.connected).toBe(true);
  });

  it('mantiene elegible al votante que ya votó aunque se desconecte', () => {
    const voting = answerEverything(started(4));
    const matchup = matchupAt(voting);
    const voters = voting.players.filter((player) => !matchup.authorIds.includes(player.id));
    const voter = voters[voters.length - 1];
    if (voter === undefined) throw new Error('Sin votante elegible');

    const voted = hostReducer(
      voting,
      {
        type: 'CAST_VOTE',
        payload: { playerId: voter.id, matchupId: matchup.id, slot: 'A' },
        now: 22_000,
      },
      seeded(),
    );
    expect(voted.phase).toBe('VOTING');

    const offline = hostReducer(
      voted,
      { type: 'PRESENCE', players: presence(3), now: 23_000 },
      seeded(),
    );
    const updated = matchupAt(offline);
    const eligible = eligibleVoterIds(offline, updated);
    expect(eligible).toContain(voter.id);
    expect(eligible.length).toBeGreaterThanOrEqual(updated.votes.length);
  });

  it('desambigua alias repetidos', () => {
    const state = hostReducer(
      createHostState('TEST'),
      { type: 'PRESENCE', players: presence(2, ['Ana', 'Ana']), now: 1000 },
      seeded(),
    );
    const aliases = state.players.map((player) => player.alias);
    expect(new Set(aliases).size).toBe(2);
  });

  it('NEW_ROOM vacía el roster y cambia el código', () => {
    const state = hostReducer(started(3), { type: 'NEW_ROOM', roomCode: 'ZZZZ', now: 60_000 }, seeded());
    expect(state.roomCode).toBe('ZZZZ');
    expect(state.players).toHaveLength(0);
    expect(state.phase).toBe('LOBBY');
  });
});
