import type { Character, CharacterId, Exhibit } from '../case/types';

/**
 * Where a call actually ran.
 * - `on-device`: Gemini Nano through the Chrome Prompt API (free, local)
 * - `remote-line`: an interrogation that fell back to the cloud because Nano is unavailable
 * - `cloud-lab`: a forensic lab request (always cloud)
 */
export type Route = 'on-device' | 'remote-line' | 'cloud-lab';

export type EngineKind = 'firebase' | 'mock';

export type DeviceStatus =
  | { state: 'ready' }
  | { state: 'downloading'; progress: number }
  | { state: 'unavailable'; reason: string };

export interface EngineResult {
  /** Raw model text. Always parsed with the hardened parsers in `parse.ts`. */
  raw: string;
  route: Route;
  ms: number;
}

/** What the game sends for one interrogation turn (ONE single-turn call). */
export interface InterrogationRequest {
  character: Character;
  question: string;
  /** Fully built single-turn prompt (persona + facts + recent exchanges). */
  prompt: string;
  /** Fact ids the character may reveal this turn (already gated by pressure). */
  allowedFactIds: readonly string[];
  /** Pressure applied this turn, if any. */
  pressure: { status: 'applied' | 'bluff'; pressureId: string } | null;
  /** How many answers this character has already given (demo engine uses it to vary lines). */
  turn: number;
}

/** What the game sends for one lab request. */
export interface LabRequest {
  exhibit: Exhibit;
  request: string;
  /** Fully built prompt (exhibit text inline for text exhibits). */
  prompt: string;
  /** Image exhibits travel as an inline part. */
  image?: { mimeType: string; base64: string };
}

export interface AiEngine {
  readonly kind: EngineKind;
  /** Human label for the UI. The demo engine must never claim to be Gemini. */
  readonly label: string;
  /**
   * Prepare the on-device model. MUST be called from a user gesture (it may start
   * the Gemini Nano download). Resolves with the device status once known; download
   * progress keeps flowing through `onStatus`.
   */
  init(onStatus: (s: DeviceStatus) => void): Promise<DeviceStatus>;
  interrogate(req: InterrogationRequest): Promise<EngineResult>;
  lab(req: LabRequest): Promise<EngineResult>;
}

export interface EngineSelection {
  engine: AiEngine;
  reason: string;
}

export type { CharacterId };
