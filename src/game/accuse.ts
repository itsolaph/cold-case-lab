import { solution as authoredSolution } from '../case/solution';
import type { CharacterId, Solution } from '../case/types';
import type { LabCall } from './state';

/** Deterministic accusation check. No AI involved. */

export interface Accusation {
  suspect: CharacterId;
  factIds: readonly [string, string];
}

export interface Verdict {
  correct: boolean;
  culpritCorrect: boolean;
  /** The chosen fact that proves means, if any. */
  meansFact: string | null;
  /** The chosen fact that proves opportunity, if any. */
  opportunityFact: string | null;
}

export class AccusationError extends Error {}

export function judgeAccusation(acc: Accusation, pinned: ReadonlySet<string>, solution: Solution = authoredSolution): Verdict {
  const [a, b] = acc.factIds;
  if (!a || !b || a === b) throw new AccusationError('Pick two different facts.');
  if (!pinned.has(a) || !pinned.has(b)) throw new AccusationError('Only facts pinned to the case board can be used.');

  const culpritCorrect = acc.suspect === solution.culprit;
  // Try both assignments: one fact must prove means, the other opportunity.
  let meansFact: string | null = null;
  let opportunityFact: string | null = null;
  if (solution.means.includes(a) && solution.opportunity.includes(b)) [meansFact, opportunityFact] = [a, b];
  else if (solution.means.includes(b) && solution.opportunity.includes(a)) [meansFact, opportunityFact] = [b, a];
  else {
    meansFact = [a, b].find((x) => solution.means.includes(x)) ?? null;
    opportunityFact = [a, b].find((x) => solution.opportunity.includes(x)) ?? null;
  }
  return {
    correct: culpritCorrect && meansFact !== null && opportunityFact !== null,
    culpritCorrect,
    meansFact,
    opportunityFact,
  };
}

/** Lab calls whose findings contain any fact of the solution's proof. */
export function decisiveLabCalls(calls: readonly LabCall[], solution: Solution = authoredSolution): string[] {
  const proof = new Set([...solution.means, ...solution.opportunity]);
  return calls.filter((c) => c.status === 'done' && c.findings.some((f) => proof.has(f.factId))).map((c) => c.id);
}
