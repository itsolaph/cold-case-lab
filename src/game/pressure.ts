import type { Character, Pressure } from '../case/types';
import { ruleMatches } from './keywords';

export interface PressureCheck {
  status: 'applied' | 'bluff';
  pressure: Pressure;
}

/**
 * Deterministic pressure gate. Code, not the model, decides whether a character cracks:
 * the question must name the evidence AND the detective must hold it on the board.
 * Naming it without holding it is a bluff.
 */
export function assessPressure(character: Character, question: string, pinned: ReadonlySet<string>): PressureCheck | null {
  let bluff: PressureCheck | null = null;
  for (const p of character.pressures) {
    if (!ruleMatches(question, p.keywords)) continue;
    if (p.evidence.some((id) => pinned.has(id))) return { status: 'applied', pressure: p };
    bluff ??= { status: 'bluff', pressure: p };
  }
  return bluff;
}

/** Pressures whose admissions are all already on the board: the character has cracked on that point. */
export function crackedPressures(character: Character, pinned: ReadonlySet<string>): Pressure[] {
  return character.pressures.filter((p) => p.reveals.every((f) => pinned.has(f.id)));
}

/** Fact ids this character may state in this turn. Secrets only once earned. */
export function allowedFactIds(character: Character, pinned: ReadonlySet<string>, check: PressureCheck | null): string[] {
  const ids = [...character.open.map((f) => f.id), ...character.claims.map((f) => f.id)];
  for (const p of crackedPressures(character, pinned)) ids.push(...p.reveals.map((f) => f.id));
  if (check?.status === 'applied') ids.push(...check.pressure.reveals.map((f) => f.id));
  return [...new Set(ids)];
}
