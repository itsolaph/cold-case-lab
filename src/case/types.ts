/**
 * Case data model.
 *
 * The case is authored, not generated. Models only *perform* it:
 * - a character prompt sees only that character's sheet (per-NPC fact boundary);
 * - the lab prompt sees only one exhibit plus that exhibit's lab truths;
 * - the solution never leaves `solution.ts` and is only read by deterministic code.
 */

export type CharacterId = 'mara' | 'felix' | 'sol' | 'ruth';
export type ExhibitId = 'phone-log' | 'badge-log' | 'receipt' | 'statement';
export type Mood = 'calm' | 'evasive' | 'rattled' | 'cracked';

/** A keyword rule: every group must match, a group matches if any of its terms appears. */
export type KeywordRule = readonly (readonly string[])[];

export interface Fact {
  id: string;
  /** Third-person wording pinned on the case board. */
  text: string;
  /** First-person line the demo engine uses when it performs this fact. */
  says: string;
}

export interface TopicFact extends Fact {
  /** Question topics that make the character mention this fact (demo engine + fallback). */
  topic: KeywordRule;
}

/**
 * A pressure point: if the question names the evidence (keywords) AND the detective
 * actually holds it (one of `evidence` is pinned), the character cracks and admits `reveals`.
 * Naming it without holding it is a bluff: the character stays evasive.
 */
export interface Pressure {
  id: string;
  keywords: KeywordRule;
  evidence: readonly string[];
  /** Short description of what the detective is confronting them with (sent to the model). */
  confrontation: string;
  /** What the character hides until cracked: a topic hint only, never the secret text. */
  hiddenTopic: string;
  reveals: readonly Fact[];
  /** Demo engine line when the detective names this without holding the evidence. */
  bluffLine: string;
}

export interface Character {
  id: CharacterId;
  name: string;
  shortName: string;
  initials: string;
  role: string;
  kind: 'suspect' | 'witness';
  custodyNo: string;
  /** One-line description shown on the tag. */
  blurb: string;
  /** Voice notes for the performer. */
  voice: string;
  /** Opening line shown when the transcript is empty. */
  greeting: string;
  /** Facts they share freely. */
  open: readonly TopicFact[];
  /** Their story (they keep to it until cracked). Pinned as a claim when stated. */
  claims: readonly TopicFact[];
  pressures: readonly Pressure[];
  /** Lines the demo engine rotates through when nothing in the question lands. */
  deflections: readonly string[];
  /** Safe in-character line used when a model reply cannot be parsed. */
  fallback: string;
}

export interface LabTruth {
  id: string;
  /** Authored finding, used verbatim by the demo engine and as the keyword fallback. */
  text: string;
  /** What a request must ask about for this truth to be reported. */
  asks: KeywordRule;
}

export interface Exhibit {
  id: ExhibitId;
  code: string;
  title: string;
  kind: 'csv' | 'log' | 'image' | 'document';
  file: string;
  mimeType: string;
  /** Where it came from, as on a chain-of-custody label. */
  provenance: string;
  /** Short size hint, e.g. "152 rows". */
  size: string;
  /** Alt text for the image exhibit. */
  alt?: string;
  truths: readonly LabTruth[];
  /** Report summary the demo engine writes when a request is too vague to support a finding. */
  vagueSummary: string;
}

export interface Solution {
  culprit: CharacterId;
  /** Any one of these proves means. */
  means: readonly string[];
  /** Any one of these proves opportunity. */
  opportunity: readonly string[];
  /** Read only after the accusation is filed. */
  narrative: readonly string[];
}

export interface CaseFile {
  id: string;
  number: string;
  title: string;
  premise: readonly [string, string];
  /** Shared public context every performer may know. */
  publicContext: string;
  characters: readonly Character[];
  exhibits: readonly Exhibit[];
}
