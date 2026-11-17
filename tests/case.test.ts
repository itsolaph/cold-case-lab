import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { caseFile, factIndex, getFact } from '../src/case';
import { solution } from '../src/case/solution';

describe('case file integrity', () => {
  it('every pressure points at evidence that exists in the case', () => {
    for (const c of caseFile.characters) for (const p of c.pressures) for (const id of p.evidence) expect(getFact(id), `${p.id} -> ${id}`).toBeDefined();
  });

  it('pressure evidence never comes from the same character (they must be confronted with outside evidence)', () => {
    for (const c of caseFile.characters)
      for (const p of c.pressures)
        for (const id of p.evidence) {
          const f = getFact(id)!;
          expect(f.source.kind === 'lab' || f.source.characterId !== c.id).toBe(true);
        }
  });

  it('the solution names a suspect and lab-certified facts', () => {
    const culprit = caseFile.characters.find((c) => c.id === solution.culprit);
    expect(culprit?.kind).toBe('suspect');
    for (const id of [...solution.means, ...solution.opportunity]) expect(getFact(id)?.source.kind).toBe('lab');
  });

  it('the guard statement is a red herring: none of its findings proves anything', () => {
    const proof = new Set([...solution.means, ...solution.opportunity]);
    const statement = caseFile.exhibits.find((e) => e.id === 'statement')!;
    for (const t of statement.truths) expect(proof.has(t.id)).toBe(false);
  });

  it('exhibit files exist and the phone log really has about 150 rows', () => {
    for (const e of caseFile.exhibits) expect(existsSync(join(process.cwd(), 'public', e.file)), e.file).toBe(true);
    const rows = readFileSync(join(process.cwd(), 'public', 'exhibits/phone-log.csv'), 'utf8').trim().split('\n').length - 1;
    expect(rows).toBeGreaterThanOrEqual(140);
    expect(rows).toBeLessThanOrEqual(160);
    expect(caseFile.exhibits[0]?.size).toBe(`${rows} rows`);
  });

  it('every lab truth is backed by the raw exhibit (key strings appear in the file)', () => {
    const raw = (f: string) => readFileSync(join(process.cwd(), 'public', f), 'utf8');
    const phone = raw('exhibits/phone-log.csv');
    expect(phone).toMatch(/2026-03-15T02:02:\d\d,H-02,"M. Quill",-,LOCUPD,-,0,HG-W2/);
    expect(phone).toMatch(/2026-03-14T18:41:\d\d,H-02,"M. Quill",IN,VOICE,555-0148,38,/);
    expect(phone).toMatch(/2026-03-15T01:52:\d\d,H-04,"Guard desk \(R. Okoye\)",IN,VOICE,555-0187,2460,HG-E1/);
    const badge = raw('exhibits/badge-log.txt');
    expect(badge).toMatch(/03-15 02:14:\d\d\s+V2-VAULT\s+0193\s+F. Arden\s+GRANTED\s+3/);
    expect(badge).toMatch(/03-14 21:47:\d\d\s+MAIN-DOOR\s+----\s+-\s+REX-EXIT/);
    expect(badge).not.toMatch(/0193\s+F. Arden\s+EXIT/);
    expect(badge).not.toMatch(/03-15 0[123]:\d\d:\d\d\s+CP-/);
    const statement = raw('exhibits/witness-statement.txt');
    expect(statement).toContain('PAGE 2 OF 2');
    expect(statement).toContain('ROUND 02:00. I did my round at 02:00.');
  });

  it('fact ids are unique across the case', () => {
    const count = caseFile.characters.reduce((n, c) => n + c.open.length + c.claims.length + c.pressures.reduce((m, p) => m + p.reveals.length, 0), 0) + caseFile.exhibits.reduce((n, e) => n + e.truths.length, 0);
    expect(factIndex.size).toBe(count);
  });
});
