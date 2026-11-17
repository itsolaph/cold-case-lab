import type { KeywordRule } from '../case/types';

/** Lower-case, unify quotes and dashes, collapse whitespace. */
export function normalize(text: string): string {
  return ` ${text
    .toLowerCase()
    .replace(/[‘’]/g, "'")
    .replace(/[‐-―]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()} `;
}

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const cache = new Map<string, RegExp>();

/**
 * A term matches when it starts at a word boundary (so "rent" matches "rented",
 * but "cell" does not match "excellent"). Terms that start with a digit or symbol
 * still need a non-alphanumeric character before them.
 */
export function hasTerm(normalized: string, term: string): boolean {
  let re = cache.get(term);
  if (!re) {
    re = new RegExp(`(^|[^a-z0-9])${escape(term.toLowerCase())}`);
    cache.set(term, re);
  }
  return re.test(normalized);
}

export function groupMatches(normalized: string, group: readonly string[]): boolean {
  return group.some((t) => hasTerm(normalized, t));
}

/** All groups must match. */
export function ruleMatches(text: string, rule: KeywordRule): boolean {
  const n = normalize(text);
  return rule.length > 0 && rule.every((g) => groupMatches(n, g));
}

/** How many groups of the rule match (0..rule.length). */
export function ruleScore(text: string, rule: KeywordRule): number {
  const n = normalize(text);
  return rule.filter((g) => groupMatches(n, g)).length;
}
