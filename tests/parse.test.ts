import { describe, expect, it } from 'vitest';
import { getCharacter, getExhibit } from '../src/case';
import { extractJsonObject, parseInterrogation, parseLab } from '../src/ai/parse';

const mara = getCharacter('mara');
const allowed = ['m_shift', 'm_claims_east'];

describe('extractJsonObject', () => {
  it('finds JSON wrapped in prose and code fences', () => {
    expect(extractJsonObject('Sure! Here you go:\n```json\n{"a": 1}\n```\nHope that helps.')).toEqual({ a: 1 });
  });
  it('handles braces inside strings', () => {
    expect(extractJsonObject('x {"reply": "a } b { c", "n": 2} y')).toEqual({ reply: 'a } b { c', n: 2 });
  });
  it('skips a broken object and takes the next valid one', () => {
    expect(extractJsonObject('{"broken": } then {"ok": true}')).toEqual({ ok: true });
  });
  it('returns undefined for no JSON, truncated JSON, or non-strings', () => {
    expect(extractJsonObject('no json here')).toBeUndefined();
    expect(extractJsonObject('{"reply": "cut off')).toBeUndefined();
    expect(extractJsonObject('')).toBeUndefined();
    expect(extractJsonObject(undefined as unknown as string)).toBeUndefined();
  });
});

describe('parseInterrogation hardening', () => {
  it('parses a clean reply and filters revealed ids to the allowed set', () => {
    const r = parseInterrogation(
      JSON.stringify({ reply: 'I was in the east houses.', mood: 'evasive', revealed: ['m_claims_east', 'f_crack_badge', 'lab_phone_cell'] }),
      mara,
      allowed,
    );
    expect(r).toEqual({ reply: 'I was in the east houses.', mood: 'evasive', revealed: ['m_claims_east'], ok: true });
  });

  it('extracts JSON with text around it', () => {
    const r = parseInterrogation('Here is my answer:\n{"reply":"Nights, ten to six.","mood":"calm","revealed":["m_shift"]} -- end', mara, allowed);
    expect(r.ok).toBe(true);
    expect(r.reply).toBe('Nights, ten to six.');
    expect(r.revealed).toEqual(['m_shift']);
  });

  it('falls back in character on invalid JSON, without crashing', () => {
    for (const raw of ['I refuse to answer that.', '{reply: nope}', '', '{"reply": 42}', '{"mood":"calm"}', '[1,2,3]', 'null']) {
      const r = parseInterrogation(raw, mara, allowed);
      expect(r.ok).toBe(false);
      expect(r.reply).toBe(mara.fallback);
      expect(r.revealed).toEqual([]);
      expect(r.mood).toBe('calm');
    }
  });

  it('normalises unknown moods, bracketed ids and speaker prefixes', () => {
    const r = parseInterrogation('{"reply":"Mara Quill: \\"Fine.\\"","mood":"furious","revealed":["[m_shift]", 7]}', mara, allowed);
    expect(r.ok).toBe(true);
    expect(r.reply).toBe('Fine.');
    expect(r.mood).toBe('calm');
    expect(r.revealed).toEqual(['m_shift']);
  });

  it('rejects replies that still contain JSON fragments', () => {
    const r = parseInterrogation('{"reply":"{\\"reply\\": \\"x\\"}","mood":"calm","revealed":[]}', mara, allowed);
    expect(r.ok).toBe(false);
  });

  it('truncates very long replies', () => {
    const r = parseInterrogation(JSON.stringify({ reply: 'word '.repeat(400), mood: 'calm', revealed: [] }), mara, allowed);
    expect(r.reply.length).toBeLessThanOrEqual(600);
  });
});

describe('parseLab hardening', () => {
  const phone = getExhibit('phone-log');
  it('keeps only known truth ids for this exhibit, deduped, with authored text as fallback', () => {
    const r = parseLab(
      'Report:\n' +
        JSON.stringify({
          findings: [
            { factId: 'lab_phone_cell', text: 'H-02 on the west sector.' },
            { factId: 'lab_phone_cell', text: 'dup' },
            { factId: 'lab_badge_override', text: 'wrong exhibit' },
            { factId: 'lab_phone_shop', text: '' },
            { factId: 'invented_fact', text: 'made up' },
            'garbage',
          ],
          summary: 'Two findings.',
        }),
      phone,
    );
    expect(r.ok).toBe(true);
    expect(r.findings.map((f) => f.factId)).toEqual(['lab_phone_cell', 'lab_phone_shop']);
    expect(r.findings[0]?.text).toBe('H-02 on the west sector.');
    expect(r.findings[1]?.text).toBe(phone.truths.find((t) => t.id === 'lab_phone_shop')?.text);
  });
  it('reports failure on invalid output', () => {
    expect(parseLab('the lab is closed', phone).ok).toBe(false);
  });
});
