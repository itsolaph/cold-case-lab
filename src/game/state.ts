import { caseFile } from '../case';
import type { CharacterId, ExhibitId, Mood } from '../case/types';
import type { Route } from '../ai/engine';

export const LAB_TOKENS = 3;
export const STORAGE_KEY = 'cold-case-lab:v1';

export interface Message {
  id: string;
  role: 'detective' | 'character' | 'notice';
  characterId: CharacterId;
  text: string;
  at: number;
  mood?: Mood;
  route?: Route;
  ms?: number;
  revealed?: string[];
  pressure?: 'applied' | 'bluff';
  /** Model output was unusable; an in-character fallback line was shown. */
  fallback?: boolean;
}

export interface Pin {
  factId: string;
  at: number;
  /** message id or lab call id that produced it */
  ref: string;
}

export interface LabFindingRecord {
  factId: string;
  text: string;
}

export interface LabCall {
  id: string;
  exhibitId: ExhibitId;
  request: string;
  status: 'working' | 'done' | 'failed';
  at: number;
  findings: LabFindingRecord[];
  summary: string;
  ms?: number;
  fallback?: boolean;
}

export interface AccusationRecord {
  suspect: CharacterId;
  factIds: [string, string];
  correct: boolean;
  at: number;
}

export interface GameState {
  version: 1;
  caseId: string;
  started: boolean;
  active: CharacterId;
  messages: Message[];
  pins: Pin[];
  labCalls: LabCall[];
  accusation: AccusationRecord | null;
  seq: number;
}

export function newGame(): GameState {
  return {
    version: 1,
    caseId: caseFile.id,
    started: false,
    active: 'mara',
    messages: [],
    pins: [],
    labCalls: [],
    accusation: null,
    seq: 0,
  };
}

export function nextId(state: GameState, prefix: string): [string, GameState] {
  const seq = state.seq + 1;
  return [`${prefix}${seq}`, { ...state, seq }];
}

// --- derived values -----------------------------------------------------------

export const pinnedSet = (s: GameState) => new Set(s.pins.map((p) => p.factId));

export function labTokensLeft(s: GameState): number {
  return Math.max(0, LAB_TOKENS - s.labCalls.filter((c) => c.status !== 'failed').length);
}

export function questionCounts(s: GameState) {
  let onDevice = 0;
  let remote = 0;
  for (const m of s.messages) {
    if (m.role !== 'character') continue;
    if (m.route === 'on-device') onDevice++;
    else if (m.route === 'remote-line') remote++;
  }
  return { asked: s.messages.filter((m) => m.role === 'detective').length, onDevice, remote };
}

export function addPins(s: GameState, factIds: readonly string[], ref: string, at: number): GameState {
  const have = pinnedSet(s);
  const fresh = factIds.filter((id) => !have.has(id));
  if (!fresh.length) return s;
  return { ...s, pins: [...s.pins, ...fresh.map((factId) => ({ factId, at, ref }))] };
}

// --- persistence --------------------------------------------------------------

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const CHARACTER_IDS = new Set(caseFile.characters.map((c) => c.id));

/** Shape check: anything off means the save is ignored, never a crash. */
export function isGameState(v: unknown): v is GameState {
  if (!isObj(v)) return false;
  return (
    v.version === 1 &&
    v.caseId === caseFile.id &&
    typeof v.started === 'boolean' &&
    typeof v.active === 'string' &&
    CHARACTER_IDS.has(v.active as CharacterId) &&
    Array.isArray(v.messages) &&
    v.messages.every((m) => isObj(m) && typeof m.id === 'string' && typeof m.text === 'string' && typeof m.role === 'string') &&
    Array.isArray(v.pins) &&
    v.pins.every((p) => isObj(p) && typeof p.factId === 'string') &&
    Array.isArray(v.labCalls) &&
    v.labCalls.every((c) => isObj(c) && typeof c.id === 'string' && Array.isArray(c.findings)) &&
    (v.accusation === null || isObj(v.accusation)) &&
    typeof v.seq === 'number'
  );
}

export function saveGame(state: GameState, storage: Pick<Storage, 'setItem'>): void {
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Storage full or blocked: the game keeps running in memory.
  }
}

export function loadGame(storage: Pick<Storage, 'getItem'>): GameState | null {
  let raw: string | null = null;
  try {
    raw = storage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isGameState(parsed)) return null;
    // A lab request interrupted by a reload never reached the lab: return the token.
    return {
      ...parsed,
      labCalls: parsed.labCalls.map((c) =>
        c.status === 'working' ? { ...c, status: 'failed' as const, summary: 'Interrupted before the lab replied. The seal was returned.' } : c,
      ),
    };
  } catch {
    return null;
  }
}

export function clearGame(storage: Pick<Storage, 'removeItem'>): void {
  try {
    storage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
