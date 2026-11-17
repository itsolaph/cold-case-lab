import type { ExhibitId } from '../case/types';
import type { AiEngine } from '../ai/engine';
import type { Game } from '../game/controller';

export type Tab = 'people' | 'room' | 'board' | 'lab';
export type CenterView = 'room' | 'lab';

export interface UiState {
  /** Desktop centre column. */
  view: CenterView;
  /** Mobile tab. */
  tab: Tab;
  labExhibit: ExhibitId;
  /** Unsent question per character, unsent lab request per exhibit. */
  drafts: Record<string, string>;
}

export interface Ctx {
  game: Game;
  engine: AiEngine;
  demo: boolean;
  engineReason: string;
  ui: UiState;
  setUi(patch: Partial<UiState>): void;
  /** Open the accusation dialog. */
  openAccuse(): void;
  /** Leave the result screen and start over. */
  newCase(): void;
}

const UI_KEY = 'cold-case-lab:ui';

export function loadUi(): UiState {
  const base: UiState = { view: 'room', tab: 'room', labExhibit: 'phone-log', drafts: {} };
  try {
    const raw = localStorage.getItem(UI_KEY);
    if (!raw) return base;
    const v = JSON.parse(raw) as Partial<UiState>;
    return {
      view: v.view === 'lab' ? 'lab' : 'room',
      tab: v.tab && ['people', 'room', 'board', 'lab'].includes(v.tab) ? v.tab : 'room',
      labExhibit: v.labExhibit && ['phone-log', 'badge-log', 'receipt', 'statement'].includes(v.labExhibit) ? v.labExhibit : 'phone-log',
      drafts: typeof v.drafts === 'object' && v.drafts ? v.drafts : {},
    };
  } catch {
    return base;
  }
}

export function saveUi(ui: UiState) {
  try {
    localStorage.setItem(UI_KEY, JSON.stringify(ui));
  } catch {
    /* ignore */
  }
}
