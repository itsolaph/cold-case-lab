import type { Character, Exhibit, Mood } from '../case/types';
import { MOODS } from './prompts';

/**
 * Hardened parsing of model output. Models (especially small on-device ones) may wrap
 * JSON in prose or code fences, truncate it, or return something else entirely.
 * Nothing here throws: every path ends in a safe value.
 */

/** Find the first balanced JSON object in `text` that parses. */
export function extractJsonObject(text: string): unknown {
  if (typeof text !== 'string' || !text) return undefined;
  const cleaned = text.replace(/```(?:json)?/gi, '');
  let start = cleaned.indexOf('{');
  let attempts = 0;
  while (start !== -1 && attempts < 8) {
    attempts++;
    let depth = 0;
    let inString = false;
    let escaped = false;
    for (let i = start; i < cleaned.length; i++) {
      const ch = cleaned[i];
      if (inString) {
        if (escaped) escaped = false;
        else if (ch === '\\') escaped = true;
        else if (ch === '"') inString = false;
        continue;
      }
      if (ch === '"') inString = true;
      else if (ch === '{') depth++;
      else if (ch === '}') {
        depth--;
        if (depth === 0) {
          try {
            return JSON.parse(cleaned.slice(start, i + 1));
          } catch {
            break;
          }
        }
      }
    }
    start = cleaned.indexOf('{', start + 1);
  }
  return undefined;
}

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

/** Strip speaker prefixes, wrapping quotes and leftover markup from a reply. */
export function cleanReply(reply: string, character: Character): string {
  let r = reply.replace(/\s+/g, ' ').trim();
  const prefixes = [character.name, character.shortName, character.name.split(' ').slice(-2).join(' ')];
  for (const p of prefixes) {
    const re = new RegExp(`^${p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*:\\s*`, 'i');
    r = r.replace(re, '');
  }
  r = r.replace(/^["“'](.*)["”']$/s, '$1').trim();
  if (r.length > 600) r = `${r.slice(0, 597).replace(/\s+\S*$/, '')}…`;
  return r;
}

export interface ParsedReply {
  reply: string;
  mood: Mood;
  revealed: string[];
  /** false when the raw output could not be used and the in-character fallback was returned. */
  ok: boolean;
}

export function parseInterrogation(raw: string, character: Character, allowed: readonly string[]): ParsedReply {
  const fallback: ParsedReply = { reply: character.fallback, mood: 'calm', revealed: [], ok: false };
  const obj = extractJsonObject(raw);
  if (!isRecord(obj)) return fallback;
  const reply = typeof obj.reply === 'string' ? cleanReply(obj.reply, character) : '';
  if (!reply || /[{}]/.test(reply)) return fallback;
  const mood = (MOODS as readonly string[]).includes(String(obj.mood)) ? (obj.mood as Mood) : 'calm';
  const allowedSet = new Set(allowed);
  const revealed = Array.isArray(obj.revealed)
    ? [...new Set(obj.revealed.filter((x): x is string => typeof x === 'string').map((x) => x.trim().replace(/^\[|\]$/g, '')))].filter((id) =>
        allowedSet.has(id),
      )
    : [];
  return { reply, mood, revealed, ok: true };
}

export interface LabFinding {
  factId: string;
  text: string;
}

export interface ParsedLab {
  findings: LabFinding[];
  summary: string;
  ok: boolean;
}

export function parseLab(raw: string, exhibit: Exhibit): ParsedLab {
  const obj = extractJsonObject(raw);
  if (!isRecord(obj)) return { findings: [], summary: '', ok: false };
  const known = new Map(exhibit.truths.map((t) => [t.id, t]));
  const findings: LabFinding[] = [];
  const seen = new Set<string>();
  if (Array.isArray(obj.findings)) {
    for (const f of obj.findings) {
      if (!isRecord(f) || typeof f.factId !== 'string') continue;
      const id = f.factId.trim();
      const truth = known.get(id);
      if (!truth || seen.has(id)) continue;
      seen.add(id);
      const text = typeof f.text === 'string' && f.text.trim() && !/[{}]/.test(f.text) ? f.text.replace(/\s+/g, ' ').trim() : truth.text;
      findings.push({ factId: id, text: text.length > 500 ? truth.text : text });
    }
  }
  const summary = typeof obj.summary === 'string' ? obj.summary.replace(/\s+/g, ' ').trim().slice(0, 700) : '';
  return { findings, summary, ok: true };
}
