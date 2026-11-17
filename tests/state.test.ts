import { describe, expect, it } from 'vitest';
import { STORAGE_KEY, addPins, clearGame, labTokensLeft, loadGame, newGame, questionCounts, saveGame, type GameState } from '../src/game/state';
import { MemoryStorage } from './helpers';

const sample = (): GameState => ({
  ...newGame(),
  started: true,
  active: 'ruth',
  seq: 4,
  messages: [
    { id: 'm1', role: 'detective', characterId: 'ruth', text: 'Rounds?', at: 1 },
    { id: 'm2', role: 'character', characterId: 'ruth', text: 'Every two hours.', at: 2, mood: 'calm', route: 'on-device', ms: 410, revealed: ['r_rounds'] },
  ],
  pins: [{ factId: 'r_rounds', at: 2, ref: 'm2' }],
  labCalls: [
    { id: 'lab3', exhibitId: 'phone-log', request: 'r', status: 'done', at: 3, findings: [{ factId: 'lab_phone_cell', text: 't' }], summary: 's', ms: 5100 },
  ],
});

describe('save and restore', () => {
  it('round-trips the full state through storage', () => {
    const st = new MemoryStorage();
    saveGame(sample(), st);
    expect(loadGame(st)).toEqual(sample());
  });

  it('returns null for missing, corrupt, foreign or old saves', () => {
    const st = new MemoryStorage();
    expect(loadGame(st)).toBeNull();
    st.setItem(STORAGE_KEY, '{not json');
    expect(loadGame(st)).toBeNull();
    st.setItem(STORAGE_KEY, JSON.stringify({ ...sample(), version: 0 }));
    expect(loadGame(st)).toBeNull();
    st.setItem(STORAGE_KEY, JSON.stringify({ ...sample(), caseId: 'other-case' }));
    expect(loadGame(st)).toBeNull();
    st.setItem(STORAGE_KEY, JSON.stringify({ ...sample(), active: 'nobody' }));
    expect(loadGame(st)).toBeNull();
    st.setItem(STORAGE_KEY, JSON.stringify({ ...sample(), messages: [{ id: 1 }] }));
    expect(loadGame(st)).toBeNull();
  });

  it('returns the seal of a lab request interrupted by a reload', () => {
    const st = new MemoryStorage();
    const s = sample();
    s.labCalls.push({ id: 'lab4', exhibitId: 'receipt', request: 'r', status: 'working', at: 4, findings: [], summary: '' });
    expect(labTokensLeft(s)).toBe(1);
    saveGame(s, st);
    const restored = loadGame(st)!;
    expect(restored.labCalls[1]?.status).toBe('failed');
    expect(labTokensLeft(restored)).toBe(2);
  });

  it('survives storage that throws', () => {
    const broken = {
      getItem: () => {
        throw new Error('denied');
      },
      setItem: () => {
        throw new Error('full');
      },
      removeItem: () => {
        throw new Error('denied');
      },
    };
    expect(() => saveGame(sample(), broken)).not.toThrow();
    expect(loadGame(broken)).toBeNull();
    expect(() => clearGame(broken)).not.toThrow();
  });

  it('clears the save on a new case file', () => {
    const st = new MemoryStorage();
    saveGame(sample(), st);
    clearGame(st);
    expect(loadGame(st)).toBeNull();
  });
});

describe('derived state', () => {
  it('counts questions per route and lab seals left', () => {
    const s = sample();
    expect(questionCounts(s)).toEqual({ asked: 1, onDevice: 1, remote: 0 });
    expect(labTokensLeft(s)).toBe(2);
    expect(labTokensLeft(newGame())).toBe(3);
  });
  it('pins each fact once', () => {
    let s = addPins(newGame(), ['a', 'b'], 'x', 1);
    s = addPins(s, ['b', 'c'], 'y', 2);
    expect(s.pins.map((p) => p.factId)).toEqual(['a', 'b', 'c']);
  });
});
